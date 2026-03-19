# app/routes/project_routes.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.project_service import (
    create_project, update_project,
    list_projects, get_project, delete_project,
)

router = APIRouter()


class SaveProjectRequest(BaseModel):
    name:      str
    scene:     dict
    thumbnail: Optional[str] = None   # base64 PNG
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
