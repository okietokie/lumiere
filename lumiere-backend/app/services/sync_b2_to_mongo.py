import logging
import os

from pymongo.errors import PyMongoError

from app.database import database

logger = logging.getLogger(__name__)

B2_KEY_ID = os.getenv("B2_KEY_ID")
B2_APP_KEY = os.getenv("B2_APP_KEY")
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME")
CDN_BASE = os.getenv("CDN_BASE", "")


async def sync_b2_to_mongo():
    if not B2_KEY_ID or not B2_APP_KEY:
        logger.warning("B2_KEY_ID / B2_APP_KEY not set - skipping B2 sync.")
        return

    try:
        from b2sdk.v2 import B2Api, InMemoryAccountInfo

        info = InMemoryAccountInfo()
        b2_api = B2Api(info)
        b2_api.authorize_account("production", B2_KEY_ID, B2_APP_KEY)
        bucket = b2_api.get_bucket_by_name(B2_BUCKET_NAME)
        logger.info("B2 sync: connected to '%s'.", B2_BUCKET_NAME)
    except Exception as exc:
        logger.error("B2 sync: could not connect - %s", exc)
        return

    existing: dict[str, int | None] = {}
    try:
        async for doc in database["models"].find({}, {"url": 1, "size_bytes": 1}):
            if doc.get("url"):
                existing[doc["url"]] = doc.get("size_bytes")
    except PyMongoError as exc:
        logger.error("B2 sync: MongoDB unavailable during existing-model scan - %s", exc)
        return

    inserted = 0
    updated = 0
    skipped = 0
    total_bytes = 0

    try:
        for file_version, _ in bucket.ls(recursive=True, latest_only=True):
            name = file_version.file_name
            if not name.lower().endswith((".glb", ".gltf")):
                continue

            cdn_url = f"{CDN_BASE.rstrip('/')}/{name}"
            size_bytes = getattr(file_version, "content_length", None) or getattr(file_version, "size", None)
            if size_bytes:
                total_bytes += size_bytes

            if cdn_url in existing:
                if size_bytes and existing[cdn_url] is None:
                    await database["models"].update_one(
                        {"url": cdn_url},
                        {"$set": {"size_bytes": size_bytes}},
                    )
                    updated += 1
                else:
                    skipped += 1
                continue

            parts = name.split("/")
            category = parts[0].lower() if len(parts) > 1 else "uncategorized"
            filename_only = parts[-1]
            display_name = (
                filename_only.rsplit(".", 1)[0]
                .replace("_", " ")
                .replace("-", " ")
                .title()
            )

            fields = {
                "name": display_name,
                "filename": name,
                "category": category,
                "url": cdn_url,
                "description": None,
            }
            if size_bytes:
                fields["size_bytes"] = size_bytes

            await database["models"].update_one(
                {"filename": name},
                {"$set": fields},
                upsert=True,
            )
            inserted += 1
            logger.info(
                "B2 sync: registered '%s' -> %s%s",
                name,
                cdn_url,
                f" ({size_bytes // 1024}KB)" if size_bytes else "",
            )
    except PyMongoError as exc:
        logger.error("B2 sync: MongoDB write failed - %s", exc)
        return
    except Exception as exc:
        logger.error("B2 sync: error listing bucket - %s", exc)
        return

    total_mb = total_bytes / 1024 / 1024
    logger.info(
        "B2 sync complete - %s new, %s size-updated, %s unchanged. Total bucket size: %.1fMB",
        inserted,
        updated,
        skipped,
        total_mb,
    )
