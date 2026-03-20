# app/services/sync_b2_to_mongo.py
# Runs at startup — lists all .glb/.gltf in B2, registers missing ones in MongoDB.
# Uses Cloudflare CDN URL so models load fast with no bandwidth caps.

import os
import logging
from app.database import database

logger = logging.getLogger(__name__)

B2_KEY_ID      = os.getenv("B2_KEY_ID")
B2_APP_KEY     = os.getenv("B2_APP_KEY")
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME")

# Cloudflare CDN URL — no bandwidth caps, globally cached
CDN_BASE = os.getenv("CDN_BASE")


async def sync_b2_to_mongo():
    if not B2_KEY_ID or not B2_APP_KEY:
        logger.warning("B2_KEY_ID / B2_APP_KEY not set — skipping B2 sync.")
        return

    try:
        from b2sdk.v2 import InMemoryAccountInfo, B2Api
        info   = InMemoryAccountInfo()
        b2_api = B2Api(info)
        b2_api.authorize_account("production", B2_KEY_ID, B2_APP_KEY)
        bucket = b2_api.get_bucket_by_name(B2_BUCKET_NAME)
        logger.info(f"B2 sync: connected to '{B2_BUCKET_NAME}'.")
    except Exception as e:
        logger.error(f"B2 sync: could not connect — {e}")
        return

    # Fetch all existing MongoDB urls for fast lookup
    existing_urls = set()
    async for doc in database["models"].find({}, {"url": 1}):
        if doc.get("url"):
            existing_urls.add(doc["url"])

    inserted = 0
    skipped  = 0

    try:
        for file_version, _ in bucket.ls(recursive=True, latest_only=True):
            name = file_version.file_name
            if not name.lower().endswith((".glb", ".gltf")):
                continue

            # Use Cloudflare CDN URL — not direct B2
            cdn_url = f"{CDN_BASE.rstrip('/')}/{name}"

            if cdn_url in existing_urls:
                skipped += 1
                continue

            parts        = name.split("/")
            category     = parts[0].lower() if len(parts) > 1 else "uncategorized"
            filename_only = parts[-1]
            display_name = filename_only.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

            await database["models"].update_one(
                {"filename": name},
                {"$set": {
                    "name":        display_name,
                    "filename":    name,
                    "category":    category,
                    "url":         cdn_url,
                    "description": None,
                }},
                upsert=True,
            )
            inserted += 1
            logger.info(f"B2 sync: registered '{name}' → {cdn_url}")

    except Exception as e:
        logger.error(f"B2 sync: error listing bucket — {e}")
        return

    logger.info(f"B2 sync complete — {inserted} new, {skipped} already in MongoDB.")