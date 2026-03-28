import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from app.services.project_service import (
    create_project, update_project,
    list_projects, get_project, delete_project,
    save_project_video,
    save_project_asset,
)

router = APIRouter()

B2_PUBLIC_URL = os.getenv("B2_PUBLIC_URL", "")
VIDEOS_DIR    = os.getenv("VIDEOS_DIR", "/tmp/lumiere_videos")
FRONTEND_URL  = os.getenv("FRONTEND_URL", "http://localhost:5173")


class SaveProjectRequest(BaseModel):
    name:      str
    scene:     dict
    thumbnail: Optional[str] = None
    user_id:   Optional[str] = None


class UpdateProjectRequest(BaseModel):
    name:      Optional[str]  = None
    scene:     Optional[dict] = None
    thumbnail: Optional[str]  = None


def _with_share_url(project: dict | None):
    if not project:
        return project
    project["share_url"] = f"{FRONTEND_URL.rstrip('/')}/view/{project['id']}"
    return project


@router.post("/save")
async def save_project(body: SaveProjectRequest):
    project = await create_project(
        name=body.name, scene=body.scene,
        thumbnail_b64=body.thumbnail, user_id=body.user_id,
    )
    return _with_share_url(project)


@router.put("/{project_id}")
async def update_project_route(project_id: str, body: UpdateProjectRequest):
    project = await update_project(
        project_id, name=body.name,
        scene=body.scene, thumbnail_b64=body.thumbnail,
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _with_share_url(project)


@router.get("/list")
async def list_projects_route(user_id: Optional[str] = None):
    return [_with_share_url(project) for project in await list_projects(user_id)]


@router.get("/{project_id}")
async def get_project_route(project_id: str):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _with_share_url(project)


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


@router.post("/{project_id}/assets/{asset_kind}")
async def upload_project_asset(
    project_id: str,
    asset_kind: str,
    file: UploadFile = File(...),
):
    normalized_kind = asset_kind.lower()
    if normalized_kind not in {"glb", "usdz"}:
        raise HTTPException(status_code=400, detail="Asset kind must be glb or usdz")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty asset file")
    if len(data) > 250 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="3D asset too large (max 250 MB)")

    upload_name = (file.filename or "").lower()
    if normalized_kind == "glb" and not upload_name.endswith(".glb"):
        raise HTTPException(status_code=400, detail="GLB upload must end with .glb")
    if normalized_kind == "usdz" and not upload_name.endswith(".usdz"):
        raise HTTPException(status_code=400, detail="USDZ upload must end with .usdz")

    asset = await save_project_asset(project_id, normalized_kind, data, file.filename)
    if not asset:
        raise HTTPException(status_code=500, detail="Failed to save 3D asset")

    return asset
