from fastapi import APIRouter, Depends
from bson import ObjectId

from app.database import project_collection, room_collection, user_collection
from app.utils.auth import get_current_user_id

router = APIRouter()


@router.get("/usage")
async def get_storage_usage(user_id: str = Depends(get_current_user_id)):
    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    used_mb = user.get("storage_used", 0) if user else 0

    project_count = await project_collection.count_documents({"user_id": user_id})
    room_count    = await room_collection.count_documents({"user_id": user_id})

    return {
        "data": {
            "used_mb":  used_mb,
            "total_mb": 500,
            "projects": {"used": project_count, "max": 50},
            "rooms":    {"used": room_count,    "max": 200},
        }
    }