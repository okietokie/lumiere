import logging
import os
import json
from urllib.parse import urlparse

from bson import ObjectId
from fastapi import HTTPException, status

from app.core.config import (
    FRONTEND_URL,
    PROJECT_ASSETS_DIR,
    PROJECT_ASSET_SERVE_URL,
    VIDEO_SERVE_URL,
    VIDEOS_DIR,
)
from app.core.database import projects_collection
from app.utils.helpers import serialize_document, utcnow

logger = logging.getLogger(__name__)

MAX_STORAGE_MB = 500
MAX_PROJECTS = 50
MAX_ROOMS = 200


def _project_title(payload_title: str | None, payload_name: str | None) -> str:
    return (payload_title or payload_name or "Untitled Room").strip() or "Untitled Room"


def _project_scene(scene_data: dict | None, scene: dict | None) -> dict:
    return scene_data or scene or {}


def _thumbnail_url(thumbnail_url: str | None, thumbnail: str | None) -> str | None:
    return thumbnail_url if thumbnail_url is not None else thumbnail


def _serialize_project(doc: dict) -> dict:
    serialized = serialize_document(doc)
    serialized["title"] = serialized.get("title") or serialized.get("name") or "Untitled Room"
    serialized["name"] = serialized["title"]
    serialized["scene_data"] = serialized.get("scene_data") or serialized.get("scene") or {}
    serialized["scene"] = serialized["scene_data"]
    serialized["thumbnail_url"] = serialized.get("thumbnail_url", serialized.get("thumbnail"))
    serialized["share_url"] = f"{FRONTEND_URL.rstrip('/')}/view/{serialized['id']}"
    serialized.setdefault(
        "model_assets",
        {
            "glb_url": None,
            "usdz_url": None,
            "glb_filename": None,
            "usdz_filename": None,
        },
    )
    serialized.pop("thumbnail", None)
    return serialized


def _object_id(value: str, detail: str = "Invalid project id") -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
    return ObjectId(value)


async def create_project(
    *,
    user_id: str,
    title: str | None = None,
    name: str | None = None,
    scene_data: dict | None = None,
    scene: dict | None = None,
    thumbnail_url: str | None = None,
    thumbnail: str | None = None,
) -> dict:
    now = utcnow()
    scene_payload = _project_scene(scene_data, scene)
    doc = {
        "user_id": ObjectId(user_id),
        "title": _project_title(title, name),
        "thumbnail_url": _thumbnail_url(thumbnail_url, thumbnail),
        "scene_data": scene_payload,
        "preview_video": None,
        "model_assets": {
            "glb_url": None,
            "usdz_url": None,
            "glb_filename": None,
            "usdz_filename": None,
        },
        "created_at": now,
        "updated_at": now,
        "last_opened_at": now,
    }
    result = await projects_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_project(doc)


async def get_owned_project(project_id: str, user_id: str) -> dict | None:
    return await projects_collection.find_one(
        {"_id": _object_id(project_id), "user_id": ObjectId(user_id)}
    )


async def update_project(
    project_id: str,
    *,
    user_id: str,
    title: str | None = None,
    name: str | None = None,
    scene_data: dict | None = None,
    scene: dict | None = None,
    thumbnail_url: str | None = None,
    thumbnail: str | None = None,
) -> dict | None:
    existing = await get_owned_project(project_id, user_id)
    updates = {"updated_at": utcnow()}
    if title is not None or name is not None:
        updates["title"] = _project_title(title, name)
    if scene_data is not None or scene is not None:
        next_scene = _project_scene(scene_data, scene)
        updates["scene_data"] = next_scene
    if thumbnail_url is not None or thumbnail is not None:
        updates["thumbnail_url"] = _thumbnail_url(thumbnail_url, thumbnail)

    await projects_collection.update_one(
        {"_id": _object_id(project_id), "user_id": ObjectId(user_id)},
        {"$set": updates},
    )
    doc = await get_owned_project(project_id, user_id)
    return _serialize_project(doc) if doc else None


async def list_projects(user_id: str) -> list[dict]:
    cursor = projects_collection.find({"user_id": ObjectId(user_id)}).sort(
        [("last_opened_at", -1), ("updated_at", -1)]
    )
    items: list[dict] = []
    async for doc in cursor:
        serialized = _serialize_project(doc)
        serialized.pop("scene_data", None)
        serialized.pop("scene", None)
        items.append(serialized)
    return items


async def get_latest_project(user_id: str) -> dict | None:
    doc = await projects_collection.find_one(
        {"user_id": ObjectId(user_id)},
        sort=[("last_opened_at", -1), ("updated_at", -1)],
    )
    return _serialize_project(doc) if doc else None


async def get_project(project_id: str) -> dict | None:
    doc = await projects_collection.find_one({"_id": _object_id(project_id)})
    return _serialize_project(doc) if doc else None


async def open_owned_project(project_id: str, user_id: str) -> dict | None:
    now = utcnow()
    await projects_collection.update_one(
        {"_id": _object_id(project_id), "user_id": ObjectId(user_id)},
        {"$set": {"last_opened_at": now, "updated_at": now}},
    )
    doc = await get_owned_project(project_id, user_id)
    return _serialize_project(doc) if doc else None


async def delete_project(project_id: str, user_id: str) -> bool:
    result = await projects_collection.delete_one(
        {"_id": _object_id(project_id), "user_id": ObjectId(user_id)}
    )
    return result.deleted_count > 0


async def save_project_video(project_id: str, user_id: str, data: bytes) -> str | None:
    project = await get_owned_project(project_id, user_id)
    if not project:
        return None

    filename = f"{project_id}_{int(utcnow().timestamp())}.webm"
    try:
        os.makedirs(VIDEOS_DIR, exist_ok=True)
        path = os.path.join(VIDEOS_DIR, filename)
        with open(path, "wb") as file_obj:
            file_obj.write(data)
        video_url = f"{VIDEO_SERVE_URL.rstrip('/')}/api/videos/{filename}"
        logger.info("Video saved locally: %s", path)
    except Exception as exc:
        logger.error("save_project_video failed: %s", exc)
        return None

    await projects_collection.update_one(
        {"_id": project["_id"]},
        {"$set": {"preview_video": video_url, "updated_at": utcnow()}},
    )
    return video_url


def _sanitize_upload_name(filename: str | None, fallback: str) -> str:
    raw = os.path.basename(filename or "").strip()
    safe = "".join(ch for ch in raw if ch.isalnum() or ch in ("-", "_", "."))
    return safe or fallback


def _resolve_local_asset_size(url: str | None, base_dir: str) -> int:
    if not url:
        return 0

    parsed = urlparse(url)
    filename = os.path.basename(parsed.path or "")
    if not filename:
        return 0

    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        return 0

    try:
        return os.path.getsize(path)
    except OSError:
        return 0


def _estimate_project_bytes(doc: dict) -> tuple[int, int]:
    scene_data = doc.get("scene_data") or doc.get("scene") or {}
    payload = {
        "title": doc.get("title"),
        "thumbnail_url": doc.get("thumbnail_url"),
        "scene_data": scene_data,
        "model_assets": doc.get("model_assets") or {},
        "preview_video": doc.get("preview_video"),
    }

    scene_bytes = len(json.dumps(payload, default=str).encode("utf-8"))
    rooms_used = len(scene_data.get("rooms") or [])
    asset_bytes = 0
    model_assets = doc.get("model_assets") or {}
    asset_bytes += _resolve_local_asset_size(doc.get("preview_video"), VIDEOS_DIR)
    asset_bytes += _resolve_local_asset_size(model_assets.get("glb_url"), PROJECT_ASSETS_DIR)
    asset_bytes += _resolve_local_asset_size(model_assets.get("usdz_url"), PROJECT_ASSETS_DIR)

    return scene_bytes + asset_bytes, rooms_used


async def get_storage_usage(user_id: str) -> dict:
    cursor = projects_collection.find({"user_id": ObjectId(user_id)})

    total_bytes = 0
    total_projects = 0
    total_rooms = 0

    async for doc in cursor:
        total_projects += 1
        project_bytes, rooms_used = _estimate_project_bytes(doc)
        total_bytes += project_bytes
        total_rooms += rooms_used

    used_mb = round(total_bytes / 1024 / 1024, 2)
    total_mb = MAX_STORAGE_MB

    return {
        "used_mb": used_mb,
        "total_mb": total_mb,
        "projects": {
            "used": total_projects,
            "max": MAX_PROJECTS,
        },
        "rooms": {
            "used": total_rooms,
            "max": MAX_ROOMS,
        },
    }


async def save_project_asset(
    project_id: str,
    user_id: str,
    asset_kind: str,
    data: bytes,
    filename: str | None,
) -> dict | None:
    project = await get_owned_project(project_id, user_id)
    if not project:
        return None
    if asset_kind not in {"glb", "usdz"}:
        raise ValueError(f"Unsupported asset kind: {asset_kind}")

    extension = f".{asset_kind}"
    original_name = _sanitize_upload_name(filename, f"design{extension}")
    if not original_name.lower().endswith(extension):
        original_name = f"{os.path.splitext(original_name)[0]}{extension}"

    stamped_name = f"{project_id}_{asset_kind}_{int(utcnow().timestamp())}_{original_name}"
    try:
        os.makedirs(PROJECT_ASSETS_DIR, exist_ok=True)
        path = os.path.join(PROJECT_ASSETS_DIR, stamped_name)
        with open(path, "wb") as file_obj:
            file_obj.write(data)
        asset_url = f"{PROJECT_ASSET_SERVE_URL.rstrip('/')}/api/project-assets/{stamped_name}"
        logger.info("Project %s asset saved locally: %s", asset_kind, path)
    except Exception as exc:
        logger.error("save_project_asset failed: %s", exc)
        return None

    await projects_collection.update_one(
        {"_id": project["_id"]},
        {
            "$set": {
                f"model_assets.{asset_kind}_url": asset_url,
                f"model_assets.{asset_kind}_filename": original_name,
                "updated_at": utcnow(),
            }
        },
    )

    return {
        "kind": asset_kind,
        "url": asset_url,
        "filename": original_name,
        "stored_name": stamped_name,
    }
