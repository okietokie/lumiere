#!/usr/bin/env python3
"""
mega_to_b2.py — Migrates .glb/.gltf files from Mega to Backblaze B2.
Skips files already in B2. Only downloads/uploads what's missing.
"""
import os
import sys
import tempfile
import shutil
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv(r"C:\Users\kalya\Lumiere\.env")

MEGA_EMAIL     = os.getenv("MEGA_EMAIL")
MEGA_PASSWORD  = os.getenv("MEGA_PASSWORD")
B2_KEY_ID      = os.getenv("B2_KEY_ID")
B2_APP_KEY     = os.getenv("B2_APP_KEY")
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME", "lumiere-models")
B2_PUBLIC_URL  = os.getenv("B2_PUBLIC_URL",  "https://f005.backblazeb2.com/file/lumiere-models")
MONGO_URI      = os.getenv("MONGO_URI",       "mongodb://localhost:27017")
MAX_FILE_MB    = 100

CATEGORY_OVERRIDES = {
    # "filename.glb": "category",
}


def get_category(file_data, all_files):
    attrs = file_data.get("a")
    if attrs and isinstance(attrs, dict):
        fname = attrs.get("n", "")
        if fname in CATEGORY_OVERRIDES:
            return CATEGORY_OVERRIDES[fname]
    parent_id = file_data.get("p")
    while parent_id and parent_id in all_files:
        parent = all_files[parent_id]
        if parent.get("t", 0) in (3, 4, 5):
            break
        a = parent.get("a")
        if a and isinstance(a, dict) and a.get("n"):
            return a["n"].lower()
        parent_id = parent.get("p")
    return "uncategorized"


def get_existing_b2_keys(bucket):
    """Returns a set of all file keys already in the B2 bucket."""
    print("Checking existing files in B2 bucket...", end=" ", flush=True)
    existing = set()
    for file_version, _ in bucket.ls(recursive=True, latest_only=True):
        existing.add(file_version.file_name)
    print(f"{len(existing)} file(s) already there.")
    return existing


def main():
    try:
        from mega import Mega
        from b2sdk.v2 import InMemoryAccountInfo, B2Api
    except ImportError as e:
        print(f"Missing package: {e}\npip install mega.py b2sdk")
        sys.exit(1)

    # ── Connect ───────────────────────────────────────────────────────────────
    print("Logging into Mega...")
    try:
        client = Mega().login(MEGA_EMAIL, MEGA_PASSWORD)
        print("Mega: connected.")
    except Exception as e:
        print(f"Mega login failed: {e}"); sys.exit(1)

    print("Logging into Backblaze B2...")
    try:
        info   = InMemoryAccountInfo()
        b2_api = B2Api(info)
        b2_api.authorize_account("production", B2_KEY_ID, B2_APP_KEY)
        bucket = b2_api.get_bucket_by_name(B2_BUCKET_NAME)
        print(f"B2: connected to '{B2_BUCKET_NAME}'.")
    except Exception as e:
        print(f"B2 login failed: {e}"); sys.exit(1)

    # ── Get what's already in B2 ──────────────────────────────────────────────
    existing_b2 = get_existing_b2_keys(bucket)

    # ── Get Mega file list ────────────────────────────────────────────────────
    print("\nFetching Mega file list...")
    files = client.get_files()

    glb_files  = []   # files to migrate
    skipped_b2 = []   # already in B2
    skipped_sz = []   # too large

    for handle, fd in files.items():
        attrs = fd.get("a")
        if not attrs or not isinstance(attrs, dict):
            continue
        name = attrs.get("n", "")
        if not name.lower().endswith((".glb", ".gltf")):
            continue

        size_mb  = fd.get("s", 0) / 1024 / 1024
        category = get_category(fd, files)
        b2_key   = f"{category}/{name}"

        if b2_key in existing_b2:
            skipped_b2.append(b2_key)
            continue
        if size_mb > MAX_FILE_MB:
            skipped_sz.append(f"{name} ({size_mb:.1f} MB)")
            continue

        glb_files.append((handle, fd, name, category, b2_key, size_mb))

    # ── Summary ───────────────────────────────────────────────────────────────
    if skipped_b2:
        print(f"\n── Already in B2 ({len(skipped_b2)}) — skipping ──")
        for k in skipped_b2:
            print(f"  ✓ {k}")

    if skipped_sz:
        print(f"\n── Too large ({len(skipped_sz)}) — skipping ──")
        for s in skipped_sz:
            print(f"  ✗ {s}")

    if not glb_files:
        print("\nAll files already in B2. Nothing to do!")
        return

    by_cat = defaultdict(list)
    for _, _, name, cat, _, size_mb in glb_files:
        by_cat[cat].append(f"{name} ({size_mb:.1f} MB)")

    print(f"\n── To upload ({len(glb_files)}) ──")
    for cat, names in sorted(by_cat.items()):
        print(f"  {cat}/")
        for n in names:
            print(f"    {n}")

    answer = input("\nLook correct? Type 'yes' to start: ").strip().lower()
    if answer != 'yes':
        print("Cancelled.")
        return

    # ── Migrate ───────────────────────────────────────────────────────────────
    succeeded = 0
    failed    = 0
    tmp_dir   = tempfile.mkdtemp(prefix="lumiere_b2_")

    try:
        for i, (handle, fd, name, category, b2_key, size_mb) in enumerate(glb_files, 1):
            public_url   = f"{B2_PUBLIC_URL.rstrip('/')}/{b2_key}"
            display_name = name.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

            print(f"\n[{i}/{len(glb_files)}] {b2_key} ({size_mb:.1f} MB)")

            # Download from Mega
            try:
                print(f"  ↓ Downloading...", end=" ", flush=True)
                client.download((handle, fd), dest_path=tmp_dir)
                tmp_file = os.path.join(tmp_dir, name)
                if not os.path.exists(tmp_file):
                    for root, _, fnames in os.walk(tmp_dir):
                        for fn in fnames:
                            if fn == name:
                                tmp_file = os.path.join(root, fn)
                                break
                print("done")
            except Exception as e:
                print(f"FAILED: {e}")
                failed += 1
                continue

            # Upload to B2
            try:
                print(f"  ↑ Uploading to B2...", end=" ", flush=True)
                bucket.upload_local_file(
                    local_file=tmp_file,
                    file_name=b2_key,
                    content_type="model/gltf-binary",
                )
                print("done")
            except Exception as e:
                print(f"FAILED: {e}")
                failed += 1
                try: os.remove(tmp_file)
                except: pass
                continue

            # Register directly in MongoDB
            try:
                from motor.motor_asyncio import AsyncIOMotorClient
                import asyncio
                async def _upsert():
                    mc = AsyncIOMotorClient(MONGO_URI)
                    await mc.lumiere.models.update_one(
                        {"filename": b2_key},
                        {"$set": {"name": display_name, "filename": b2_key,
                                  "category": category, "url": public_url}},
                        upsert=True,
                    )
                    mc.close()
                asyncio.run(_upsert())
                print(f"  ✓ Registered: {display_name}")
            except Exception as e:
                print(f"  ⚠ MongoDB error: {e}")

            try: os.remove(tmp_file)
            except: pass

            succeeded += 1

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    print(f"\n{'='*50}")
    print(f"Done! {succeeded} uploaded, {failed} failed.")
    if succeeded > 0:
        print(f"Restart your backend — models now live at: {B2_PUBLIC_URL}/")

if __name__ == "__main__":
    main()