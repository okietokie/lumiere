# app/services/model_service.py
import os
import shutil
import logging
from pathlib import Path
from fastapi import UploadFile
from app.database import database

logger = logging.getLogger(__name__)

MODEL_STORAGE_PATH = os.getenv("MODEL_STORAGE_PATH", "./models")
os.makedirs(MODEL_STORAGE_PATH, exist_ok=True)


def _patch_mega():
    """Fix WinError 32 in mega.py by replacing shutil.move with shutil.copy2."""
    try:
        import mega as _mega_mod
        p = Path(_mega_mod.__file__).parent / "mega.py"
        t = p.read_text(encoding="utf-8")
        if "shutil.move(temp_output_file.name, output_path)" in t:
            t = t.replace(
                "shutil.move(temp_output_file.name, output_path)",
                "shutil.copy2(temp_output_file.name, output_path)"
            )
            p.write_text(t, encoding="utf-8")
            logger.info("mega.py patched: shutil.move → shutil.copy2")
    except Exception as e:
        logger.warning(f"Could not patch mega.py (non-fatal): {e}")

_patch_mega()


# ---------------------------------------------------------------------------
# Local disk scan — runs instantly on startup, registers already-cached files
# ---------------------------------------------------------------------------

async def sync_from_local():
    """
    Walks MODEL_STORAGE_PATH and upserts every .glb/.gltf into MongoDB.
    upsert=True means stale/mismatched existing docs are always corrected.
    Runs at startup before Mega so the list is populated instantly.
    """
    found = 0
    for root, dirs, files in os.walk(MODEL_STORAGE_PATH):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for filename in files:
            if not filename.lower().endswith((".glb", ".gltf")):
                continue
            abs_path = os.path.join(root, filename)
            rel_path = os.path.relpath(abs_path, MODEL_STORAGE_PATH).replace(os.sep, "/")
            parent       = os.path.basename(root)
            category     = parent.lower() if parent != os.path.basename(MODEL_STORAGE_PATH) else "uncategorized"
            display_name = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

            await database["models"].update_one(
                {"filename": rel_path},
                {"$set": {
                    "name":        display_name,
                    "filename":    rel_path,
                    "category":    category,
                    "description": None,
                }},
                upsert=True,
            )
            found += 1
            logger.debug(f"Upserted: {rel_path}")

    logger.info(f"Local scan: {found} model(s) on disk registered/verified in MongoDB.")


async def sync_from_mega():
    """
    Downloads every .glb/.gltf file from your Mega account into
    MODEL_STORAGE_PATH, organised into subfolders by category, and
    upserts metadata into MongoDB.

    Requires in .env:
        MEGA_EMAIL=you@example.com
        MEGA_PASSWORD=yourpassword
    """
    mega_email    = os.getenv("MEGA_EMAIL")
    mega_password = os.getenv("MEGA_PASSWORD")

    if not mega_email or not mega_password:
        logger.warning("MEGA_EMAIL / MEGA_PASSWORD not set — skipping Mega sync.")
        return

    try:
        from mega import Mega
        m      = Mega()
        client = m.login(mega_email, mega_password)
        logger.info("Logged into Mega successfully.")
    except Exception as e:
        logger.error(f"Mega login failed: {e}")
        return

    try:
        files = client.get_files()
    except Exception as e:
        logger.error(f"Could not list Mega files: {e}")
        return

    synced = 0

    for handle, file_data in files.items():
        # file_data['a'] holds the attributes dict; 'n' is the filename
        attrs = file_data.get("a")
        if not attrs or not isinstance(attrs, dict):
            continue

        name: str = attrs.get("n", "")
        if not name.lower().endswith((".glb", ".gltf")):
            continue

        category     = _category_from_file_data(file_data, files)
        category_dir = os.path.join(MODEL_STORAGE_PATH, category)
        os.makedirs(category_dir, exist_ok=True)

        dest = os.path.join(category_dir, name)

        if os.path.exists(dest):
            logger.info(f"Already cached: {category}/{name}")
        else:
            try:
                logger.info(f"Downloading from Mega: {name}")
                client.download((handle, file_data), dest_path=category_dir)
                logger.info(f"Downloaded: {category}/{name}")
            except Exception as e:
                logger.error(f"Failed to download {name}: {e}")
                continue

        rel_path     = f"{category}/{name}"
        display_name = name.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

        existing = await database["models"].find_one({"filename": rel_path})
        if not existing:
            await database["models"].insert_one({
                "name":        display_name,
                "filename":    rel_path,
                "category":    category,
                "description": None,
            })
        synced += 1

    logger.info(f"Mega sync complete — {synced} model(s) ready.")


def _category_from_file_data(file_data: dict, all_files: dict) -> str:
    """
    Tries to resolve the Mega parent folder name as the category.
    Falls back to 'uncategorized' if the file is in the root.
    """
    parent_id = file_data.get("p")
    if parent_id and parent_id in all_files:
        parent = all_files[parent_id]
        parent_attrs = parent.get("a")
        if parent_attrs and isinstance(parent_attrs, dict):
            folder_name = parent_attrs.get("n", "")
            if folder_name:
                return folder_name.lower()
    return "uncategorized"


# ---------------------------------------------------------------------------
# CRUD helpers used by model_routes.py
# ---------------------------------------------------------------------------

async def save_model(
    file: UploadFile,
    name: str,
    description: str = None,
    category: str = "uncategorized",
):
    category_dir = os.path.join(MODEL_STORAGE_PATH, category)
    os.makedirs(category_dir, exist_ok=True)

    filepath = os.path.join(category_dir, file.filename)
    with open(filepath, "wb") as f:
        f.write(await file.read())

    rel_path = f"{category}/{file.filename}"
    result = await database["models"].insert_one({
        "name":        name,
        "filename":    rel_path,
        "category":    category,
        "description": description,
    })
    return str(result.inserted_id)


async def list_models():
    """Returns only models whose files actually exist on disk."""
    cursor = database["models"].find()
    models = []
    async for doc in cursor:
        filepath = os.path.join(MODEL_STORAGE_PATH, doc.get("filename", ""))
        if not os.path.exists(filepath):
            continue  # skip stale DB entries for files not yet downloaded
        doc["id"] = str(doc.pop("_id"))
        models.append(doc)
    return models


async def get_model_file(filename: str):
    filepath = os.path.join(MODEL_STORAGE_PATH, filename)
    return filepath if os.path.exists(filepath) else None