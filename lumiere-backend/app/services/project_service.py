# app/services/project_service.py
import os
import logging
from datetime import datetime
from bson import ObjectId
from app.database import database

logger    = logging.getLogger(__name__)
COLLECTION = "projects"

# Videos: stored locally under VIDEOS_DIR, served via /api/videos/{filename}.
# For production on Render (ephemeral disk) swap this out for B2 upload —
# see the commented-out B2 section below.
VIDEOS_DIR    = os.getenv("VIDEOS_DIR", "/tmp/lumiere_videos")
VIDEO_SERVE   = os.getenv("VIDEO_SERVE_URL", "")   # e.g. https://api.lumiere-maison.site


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def create_project(
    name: str, scene: dict,
    thumbnail_b64: str = None,
    user_id: str = None,
) -> dict:
    now = datetime.utcnow().isoformat()
    doc = {
        "name":          name,
        "scene":         scene,
        "thumbnail":     thumbnail_b64,
        "preview_video": None,          # set later by save_project_video
        "user_id":       user_id,
        "created_at":    now,
        "updated_at":    now,
    }
    result = await database[COLLECTION].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


async def update_project(
    project_id: str,
    name: str = None,
    scene: dict = None,
    thumbnail_b64: str = None,
) -> dict | None:
    updates = {"updated_at": datetime.utcnow().isoformat()}
    if name          is not None: updates["name"]      = name
    if scene         is not None: updates["scene"]      = scene
    if thumbnail_b64 is not None: updates["thumbnail"]  = thumbnail_b64

    result = await database[COLLECTION].find_one_and_update(
        {"_id": ObjectId(project_id)},
        {"$set": updates},
        return_document=True,
    )
    return _serialize(result) if result else None


async def save_project_video(project_id: str, data: bytes) -> str | None:
    """
    Persist a WebM video blob and store its public URL in the project.

    Strategy A (default) — local disk:
      Works on any server with persistent storage.
      On Render's free tier the disk is ephemeral, so videos vanish on redeploy.
      For a quick start this is fine — swap to Strategy B for production.

    Strategy B (commented out) — Backblaze B2:
      Upload via b2sdk, same bucket as the GLB models.
      Uncomment and fill in B2_KEY_ID / B2_APP_KEY / B2_BUCKET_NAME.
    """
    filename = f"{project_id}_{int(datetime.utcnow().timestamp())}.webm"

    # ── Strategy A: local disk ────────────────────────────────────────────────
    try:
        os.makedirs(VIDEOS_DIR, exist_ok=True)
        path = os.path.join(VIDEOS_DIR, filename)
        with open(path, "wb") as f:
            f.write(data)
        video_url = f"{VIDEO_SERVE.rstrip('/')}/api/videos/{filename}"
        logger.info(f"Video saved locally: {path}")
    except Exception as e:
        logger.error(f"save_project_video (local) failed: {e}")
        return None

    # ── Strategy B: Backblaze B2 (uncomment for production) ──────────────────
    # try:
    #     from b2sdk.v2 import InMemoryAccountInfo, B2Api
    #     import io
    #     info   = InMemoryAccountInfo()
    #     b2     = B2Api(info)
    #     b2.authorize_account("production",
    #                          os.getenv("B2_KEY_ID"), os.getenv("B2_APP_KEY"))
    #     bucket = b2.get_bucket_by_name(os.getenv("B2_BUCKET_NAME"))
    #     key    = f"videos/{filename}"
    #     bucket.upload_bytes(data, key, content_type="video/webm")
    #     cdn    = os.getenv("CDN_BASE", "").rstrip("/")
    #     video_url = f"{cdn}/{key}"
    # except Exception as e:
    #     logger.error(f"save_project_video (B2) failed: {e}")
    #     return None

    # Store URL in MongoDB
    await database[COLLECTION].update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"preview_video": video_url, "updated_at": datetime.utcnow().isoformat()}},
    )
    return video_url


async def list_projects(user_id: str = None) -> list:
    query  = {"user_id": user_id} if user_id else {}
    cursor = database[COLLECTION].find(query).sort("updated_at", -1)
    out    = []
    async for doc in cursor:
        doc.pop("scene", None)    # omit heavy scene data from list
        out.append(_serialize(doc))
    return out


async def get_project(project_id: str) -> dict | None:
    doc = await database[COLLECTION].find_one({"_id": ObjectId(project_id)})
    return _serialize(doc) if doc else None


async def delete_project(project_id: str) -> bool:
    result = await database[COLLECTION].delete_one({"_id": ObjectId(project_id)})
    return result.deleted_count > 0