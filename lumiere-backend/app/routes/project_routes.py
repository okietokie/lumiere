# app/routes/project_routes.py
import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from app.services.project_service import (
    create_project, update_project,
    list_projects, get_project, delete_project,
    save_project_video,
)

router = APIRouter()

B2_PUBLIC_URL = os.getenv("B2_PUBLIC_URL", "")
VIDEOS_DIR    = os.getenv("VIDEOS_DIR", "/tmp/lumiere_videos")


class SaveProjectRequest(BaseModel):
    name:      str
    scene:     dict
    thumbnail: Optional[str] = None
    user_id:   Optional[str] = None


class UpdateProjectRequest(BaseModel):
    name:      Optional[str]  = None
    scene:     Optional[dict] = None
    thumbnail: Optional[str]  = None


@router.post("/save")
async def save_project(body: SaveProjectRequest):
    project = await create_project(
        name=body.name, scene=body.scene,
        thumbnail_b64=body.thumbnail, user_id=body.user_id,
    )
    return project


@router.put("/{project_id}")
async def update_project_route(project_id: str, body: UpdateProjectRequest):
    project = await update_project(
        project_id, name=body.name,
        scene=body.scene, thumbnail_b64=body.thumbnail,
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/list")
async def list_projects_route(user_id: Optional[str] = None):
    return await list_projects(user_id)


@router.get("/{project_id}")
async def get_project_route(project_id: str):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}")
async def delete_project_route(project_id: str):
    ok = await delete_project(project_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"deleted": True}


# ── Video upload ──────────────────────────────────────────────────────────────
@router.post("/{project_id}/video")
async def upload_project_video(
    project_id: str,
    video: UploadFile = File(...),
):
    """
    Receives a WebM video blob from the Auto Capture feature.
    Saves it to disk (or B2 — see save_project_video) and stores
    the URL in the project document under preview_video.
    """
    if not video.content_type or "video" not in video.content_type:
        raise HTTPException(status_code=400, detail="File must be a video")

    data = await video.read()
    if len(data) > 100 * 1024 * 1024:   # 100 MB hard cap
        raise HTTPException(status_code=413, detail="Video too large (max 100 MB)")

    video_url = await save_project_video(project_id, data)
    if not video_url:
        raise HTTPException(status_code=500, detail="Failed to save video")

    return {"video_url": video_url}