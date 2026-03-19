# app/services/project_service.py
import os
import base64
import logging
from datetime import datetime
from bson import ObjectId
from app.database import database

logger = logging.getLogger(__name__)

COLLECTION = "projects"


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def create_project(name: str, scene: dict, thumbnail_b64: str = None, user_id: str = None) -> dict:
    now = datetime.utcnow().isoformat()
    doc = {
        "name":       name,
        "scene":      scene,
        "thumbnail":  thumbnail_b64,   # base64 PNG string or None
        "user_id":    user_id,
        "created_at": now,
        "updated_at": now,
    }
    result = await database[COLLECTION].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


async def update_project(project_id: str, name: str = None, scene: dict = None, thumbnail_b64: str = None) -> dict | None:
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


async def list_projects(user_id: str = None) -> list:
    query  = {"user_id": user_id} if user_id else {}
    cursor = database[COLLECTION].find(query).sort("updated_at", -1)
    out    = []
    async for doc in cursor:
        # Don't return full scene in list — only metadata + thumbnail
        doc.pop("scene", None)
        out.append(_serialize(doc))
    return out


async def get_project(project_id: str) -> dict | None:
    doc = await database[COLLECTION].find_one({"_id": ObjectId(project_id)})
    return _serialize(doc) if doc else None


async def delete_project(project_id: str) -> bool:
    result = await database[COLLECTION].delete_one({"_id": ObjectId(project_id)})
    return result.deleted_count > 0
