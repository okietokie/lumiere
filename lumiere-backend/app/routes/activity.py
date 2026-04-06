from fastapi import APIRouter, Depends
from datetime import datetime
from bson import ObjectId

from app.database import activity_collection, project_collection, room_collection, user_collection
from app.utils.auth import get_current_user_id

router = APIRouter()


def _out(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


# ── GET recent activity ────────────────────────────────
@router.get("/user")
async def get_activity(user_id: str = Depends(get_current_user_id)):
    cursor = (
        activity_collection
        .find({"user_id": user_id})
        .sort("timestamp", -1)
        .limit(20)
    )
    items = [_out(doc) async for doc in cursor]
    return {"data": items}


# ── LOG an activity ────────────────────────────────────
@router.post("/log")
async def log_activity(
    payload: dict,
    user_id: str = Depends(get_current_user_id),
):
    doc = {
        "user_id":      user_id,
        "project_id":   payload.get("project_id"),
        "type":         payload.get("type", "edited"),
        "action":       payload.get("action", ""),
        "target":       payload.get("target"),
        "project_name": payload.get("project_name"),
        "timestamp":    datetime.utcnow(),
    }
    await activity_collection.insert_one(doc)
    return {"message": "Logged."}


# ── GET storage usage ──────────────────────────────────
@router.get("/storage/usage")
async def get_storage_usage(user_id: str = Depends(get_current_user_id)):
    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    used_mb = user.get("storage_used", 0) if user else 0

    project_count = await project_collection.count_documents({"user_id": user_id})
    room_count    = await room_collection.count_documents({})  # could scope per user

    return {
        "data": {
            "used_mb":  used_mb,
            "total_mb": 500,
            "projects": {"used": project_count, "max": 50},
            "rooms":    {"used": room_count,    "max": 200},
        }
    }
