from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
from bson import ObjectId

from app.database import room_collection, project_collection, activity_collection
from app.models.schemas import RoomCreate, RoomUpdate
from app.utils.auth import get_current_user_id

router = APIRouter()


def _out(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def _log(user_id, project_id, ptype, action, target=None, project_name=None):
    await activity_collection.insert_one({
        "user_id":      user_id,
        "project_id":   project_id,
        "type":         ptype,
        "action":       action,
        "target":       target,
        "project_name": project_name,
        "timestamp":    datetime.utcnow(),
    })


async def _verify_project_owner(project_id: str, user_id: str):
    """Raise 403/404 if project doesn't belong to user."""
    proj = await project_collection.find_one({"_id": ObjectId(project_id), "user_id": user_id})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")
    return proj


# ── GET all rooms for a project ─────────────────────────
@router.get("/{project_id}")
async def get_rooms(project_id: str, user_id: str = Depends(get_current_user_id)):
    await _verify_project_owner(project_id, user_id)
    cursor = room_collection.find({"project_id": project_id}).sort("created_at", -1)
    rooms = [_out(doc) async for doc in cursor]
    return {"data": rooms}


# ── CREATE room ─────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_room(payload: RoomCreate, user_id: str = Depends(get_current_user_id)):
    proj = await _verify_project_owner(payload.project_id, user_id)

    now = datetime.utcnow()
    doc = {
        "project_id": payload.project_id,
        "name":       payload.name,
        "width":      payload.width,
        "height":     payload.height,
        "objects":    payload.objects,
        "created_at": now,
        "updated_at": now,
    }
    result = await room_collection.insert_one(doc)
    rid = str(result.inserted_id)

    # Touch project last_modified
    await project_collection.update_one(
        {"_id": ObjectId(payload.project_id)},
        {"$set": {"last_modified": now}},
    )

    await _log(
        user_id, payload.project_id, "created",
        "Created room", payload.name, proj.get("name"),
    )

    doc["id"] = rid
    doc.pop("_id", None)
    return {"data": doc}


# ── UPDATE room ─────────────────────────────────────────
@router.put("/{room_id}")
async def update_room(
    room_id: str,
    payload: RoomUpdate,
    user_id: str = Depends(get_current_user_id),
):
    room = await room_collection.find_one({"_id": ObjectId(room_id)})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    await _verify_project_owner(room["project_id"], user_id)

    updates = {k: v for k, v in payload.dict(exclude_none=True).items()}
    updates["updated_at"] = datetime.utcnow()

    await room_collection.update_one({"_id": ObjectId(room_id)}, {"$set": updates})
    await project_collection.update_one(
        {"_id": ObjectId(room["project_id"])},
        {"$set": {"last_modified": updates["updated_at"]}},
    )

    await _log(user_id, room["project_id"], "edited", "Updated room", room.get("name"))
    return {"message": "Room updated."}


# ── DELETE room ─────────────────────────────────────────
@router.delete("/{room_id}", status_code=status.HTTP_200_OK)
async def delete_room(room_id: str, user_id: str = Depends(get_current_user_id)):
    room = await room_collection.find_one({"_id": ObjectId(room_id)})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    await _verify_project_owner(room["project_id"], user_id)
    await room_collection.delete_one({"_id": ObjectId(room_id)})
    await _log(user_id, room["project_id"], "deleted", "Deleted room", room.get("name"))
    return {"message": "Room deleted."}
