from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.security import get_current_user
from app.schemas.project_schema import SaveProjectRequest, UpdateProjectRequest
from app.services.project_service import (
    create_project,
    delete_project,
    get_latest_project,
    get_project,
    list_projects,
    open_owned_project,
    save_project_asset,
    save_project_video,
    update_project,
)

router = APIRouter()


@router.post("/save")
async def save_project_route(
    body: SaveProjectRequest,
    current_user: dict = Depends(get_current_user),
):
    return await create_project(
        user_id=str(current_user["_id"]),
        title=body.title,
        name=body.name,
        scene_data=body.scene_data,
        scene=body.scene,
        thumbnail_url=body.thumbnail_url,
        thumbnail=body.thumbnail,
    )


@router.get("/list")
async def list_projects_route(current_user: dict = Depends(get_current_user)):
    return await list_projects(str(current_user["_id"]))


@router.get("/me/latest")
async def latest_project_route(current_user: dict = Depends(get_current_user)):
    project = await get_latest_project(str(current_user["_id"]))
    if not project:
        return {}
    return project


@router.get("/me/open/{project_id}")
async def open_project_route(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    project = await open_owned_project(project_id, str(current_user["_id"]))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}")
async def update_project_route(
    project_id: str,
    body: UpdateProjectRequest,
    current_user: dict = Depends(get_current_user),
):
    project = await update_project(
        project_id,
        user_id=str(current_user["_id"]),
        title=body.title,
        name=body.name,
        scene_data=body.scene_data,
        scene=body.scene,
        thumbnail_url=body.thumbnail_url,
        thumbnail=body.thumbnail,
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}")
async def get_project_route(project_id: str):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}")
async def delete_project_route(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    ok = await delete_project(project_id, str(current_user["_id"]))
    if not ok:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"deleted": True}


@router.post("/{project_id}/video")
async def upload_project_video(
    project_id: str,
    video: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if not video.content_type or "video" not in video.content_type:
        raise HTTPException(status_code=400, detail="File must be a video")

    data = await video.read()
    if len(data) > 100 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Video too large (max 100 MB)")

    video_url = await save_project_video(project_id, str(current_user["_id"]), data)
    if not video_url:
        raise HTTPException(status_code=404, detail="Project not found or failed to save video")
    return {"video_url": video_url}


@router.post("/{project_id}/assets/{asset_kind}")
async def upload_project_asset(
    project_id: str,
    asset_kind: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
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

    asset = await save_project_asset(
        project_id,
        str(current_user["_id"]),
        normalized_kind,
        data,
        file.filename,
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Project not found or failed to save 3D asset")
    return asset
