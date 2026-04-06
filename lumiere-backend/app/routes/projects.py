from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
from bson import ObjectId
import copy

from app.database import project_collection, room_collection, activity_collection
from app.models.schemas import ProjectCreate, ProjectUpdate
from app.utils.auth import get_current_user_id

router = APIRouter()


def _out(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def _count_rooms(project_id: str) -> int:
    return await room_collection.count_documents({"project_id": project_id})


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


# ── GET all projects ────────────────────────────────────
@router.get("")
async def get_projects(user_id: str = Depends(get_current_user_id)):
    cursor = project_collection.find({"user_id": user_id}).sort("last_modified", -1)
    projects = []
    total_rooms = 0
    last_modified = None

    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        rc = await _count_rooms(doc["id"])
        doc["rooms_count"] = rc
        total_rooms += rc
        if last_modified is None:
            last_modified = doc
        projects.append(doc)

    return {
        "data":          projects,
        "total_rooms":   total_rooms,
        "total_assets":  0,
        "last_modified": last_modified,
    }


# ── GET last session ────────────────────────────────────
@router.get("/last")
async def get_last(user_id: str = Depends(get_current_user_id)):
    doc = await project_collection.find_one(
        {"user_id": user_id},
        sort=[("last_modified", -1)],
    )
    if not doc:
        return {"data": None}
    return {"data": _out(doc)}


# ── SEARCH ─────────────────────────────────────────────
@router.get("/search")
async def search_projects(q: str, user_id: str = Depends(get_current_user_id)):
    regex = {"$regex": q, "$options": "i"}
    cursor = project_collection.find({
        "user_id": user_id,
        "$or": [{"name": regex}, {"description": regex}],
    })
    results = [_out(doc) async for doc in cursor]
    return {"data": results}


# ── GET single ─────────────────────────────────────────
@router.get("/{project_id}")
async def get_project(project_id: str, user_id: str = Depends(get_current_user_id)):
    doc = await project_collection.find_one({"_id": ObjectId(project_id), "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found.")
    doc["rooms_count"] = await _count_rooms(project_id)
    return {"data": _out(doc)}


# ── CREATE ─────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate, user_id: str = Depends(get_current_user_id)):
    now = datetime.utcnow()
    doc = {
        "user_id":       user_id,
        "name":          payload.name,
        "description":   payload.description,
        "thumbnail":     payload.thumbnail,
        "created_at":    now,
        "last_modified": now,
    }
    result = await project_collection.insert_one(doc)
    pid    = str(result.inserted_id)
    await _log(user_id, pid, "created", "Created project", payload.name)
    doc["id"]          = pid
    doc["rooms_count"] = 0
    doc.pop("_id", None)
    return {"data": doc}


# ── UPDATE ─────────────────────────────────────────────
@router.put("/{project_id}")
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    user_id: str = Depends(get_current_user_id),
):
    updates = {k: v for k, v in payload.dict(exclude_none=True).items()}
    updates["last_modified"] = datetime.utcnow()

    result = await project_collection.update_one(
        {"_id": ObjectId(project_id), "user_id": user_id},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found.")

    await _log(user_id, project_id, "edited", "Updated project")
    return {"message": "Project updated."}


# ── DELETE ─────────────────────────────────────────────
@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
async def delete_project(project_id: str, user_id: str = Depends(get_current_user_id)):
    doc = await project_collection.find_one({"_id": ObjectId(project_id), "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found.")

    await project_collection.delete_one({"_id": ObjectId(project_id)})
    await room_collection.delete_many({"project_id": project_id})
    await _log(user_id, project_id, "deleted", "Deleted project", doc.get("name"))
    return {"message": "Project deleted."}


# ── DUPLICATE ──────────────────────────────────────────
@router.post("/{project_id}/duplicate", status_code=status.HTTP_201_CREATED)
async def duplicate_project(project_id: str, user_id: str = Depends(get_current_user_id)):
    original = await project_collection.find_one({"_id": ObjectId(project_id), "user_id": user_id})
    if not original:
        raise HTTPException(status_code=404, detail="Project not found.")

    now  = datetime.utcnow()
    copy_doc = {
        "user_id":       user_id,
        "name":          f"{original['name']} (Copy)",
        "description":   original.get("description"),
        "thumbnail":     original.get("thumbnail"),
        "created_at":    now,
        "last_modified": now,
    }
    result  = await project_collection.insert_one(copy_doc)
    new_pid = str(result.inserted_id)

    # Duplicate rooms
    rooms_cursor = room_collection.find({"project_id": project_id})
    async for room in rooms_cursor:
        room.pop("_id")
        room["project_id"]  = new_pid
        room["created_at"]  = now
        await room_collection.insert_one(room)

    copy_doc["id"]          = new_pid
    copy_doc["rooms_count"] = await _count_rooms(new_pid)
    copy_doc.pop("_id", None)
    return {"data": copy_doc}
