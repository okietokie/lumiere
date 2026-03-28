import os
import logging
from datetime import datetime
from bson import ObjectId
from app.database import database

logger = logging.getLogger(__name__)
COLLECTION = "projects"

# Stores generated walkthrough videos on local disk.
VIDEOS_DIR = os.getenv("VIDEOS_DIR", "/tmp/lumiere_videos")
VIDEO_SERVE = os.getenv("VIDEO_SERVE_URL", "")
PROJECT_ASSETS_DIR = os.getenv("PROJECT_ASSETS_DIR", "/tmp/lumiere_project_assets")
PROJECT_ASSET_SERVE = os.getenv("PROJECT_ASSET_SERVE_URL", "")


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
        "name": name,
        "scene": scene,
        "thumbnail": thumbnail_b64,
        "preview_video": None,
        "model_assets": {
            "glb_url": None,
            "usdz_url": None,
            "glb_filename": None,
            "usdz_filename": None,
        },
        "user_id": user_id,
        "created_at": now,
        "updated_at": now,
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
    if name is not None:
        updates["name"] = name
    if scene is not None:
        updates["scene"] = scene
    if thumbnail_b64 is not None:
        updates["thumbnail"] = thumbnail_b64

    result = await database[COLLECTION].find_one_and_update(
        {"_id": ObjectId(project_id)},
        {"$set": updates},
        return_document=True,
    )
    return _serialize(result) if result else None


async def save_project_video(project_id: str, data: bytes) -> str | None:
    """Saves a preview video and stores its public URL."""
    filename = f"{project_id}_{int(datetime.utcnow().timestamp())}.webm"

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

    await database[COLLECTION].update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"preview_video": video_url, "updated_at": datetime.utcnow().isoformat()}},
    )
    return video_url


def _sanitize_upload_name(filename: str | None, fallback: str) -> str:
    raw = os.path.basename(filename or "").strip()
    safe = "".join(ch for ch in raw if ch.isalnum() or ch in ("-", "_", "."))
    return safe or fallback


async def save_project_asset(project_id: str, asset_kind: str, data: bytes, filename: str | None) -> dict | None:
    if asset_kind not in {"glb", "usdz"}:
        raise ValueError(f"Unsupported asset kind: {asset_kind}")

    extension = f".{asset_kind}"
    original_name = _sanitize_upload_name(filename, f"design{extension}")
    if not original_name.lower().endswith(extension):
        original_name = f"{os.path.splitext(original_name)[0]}{extension}"

    stamped_name = f"{project_id}_{asset_kind}_{int(datetime.utcnow().timestamp())}_{original_name}"

    try:
        os.makedirs(PROJECT_ASSETS_DIR, exist_ok=True)
        path = os.path.join(PROJECT_ASSETS_DIR, stamped_name)
        with open(path, "wb") as f:
            f.write(data)
        asset_url = f"{PROJECT_ASSET_SERVE.rstrip('/')}/api/project-assets/{stamped_name}"
        logger.info(f"Project {asset_kind} asset saved locally: {path}")
    except Exception as e:
        logger.error(f"save_project_asset failed: {e}")
        return None

    updates = {
        f"model_assets.{asset_kind}_url": asset_url,
        f"model_assets.{asset_kind}_filename": original_name,
        "updated_at": datetime.utcnow().isoformat(),
    }
    await database[COLLECTION].update_one(
        {"_id": ObjectId(project_id)},
        {"$set": updates},
    )

    return {
        "kind": asset_kind,
        "url": asset_url,
        "filename": original_name,
        "stored_name": stamped_name,
    }


async def list_projects(user_id: str = None) -> list:
    query = {"user_id": user_id} if user_id else {}
    cursor = database[COLLECTION].find(query).sort("updated_at", -1)
    out = []
    async for doc in cursor:
        doc.pop("scene", None)
        out.append(_serialize(doc))
    return out


async def get_project(project_id: str) -> dict | None:
    doc = await database[COLLECTION].find_one({"_id": ObjectId(project_id)})
    return _serialize(doc) if doc else None


async def delete_project(project_id: str) -> bool:
    result = await database[COLLECTION].delete_one({"_id": ObjectId(project_id)})
    return result.deleted_count > 0
