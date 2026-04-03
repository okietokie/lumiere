from typing import Any

from pydantic import BaseModel, Field


class SaveProjectRequest(BaseModel):
    title: str | None = None
    name: str | None = None
    scene_data: dict[str, Any] | None = None
    scene: dict[str, Any] | None = None
    thumbnail_url: str | None = None
    thumbnail: str | None = None


class UpdateProjectRequest(BaseModel):
    title: str | None = None
    name: str | None = None
    scene_data: dict[str, Any] | None = None
    scene: dict[str, Any] | None = None
    thumbnail_url: str | None = None
    thumbnail: str | None = None


class ProjectResponse(BaseModel):
    id: str
    title: str
    name: str
    thumbnail_url: str | None = None
    scene_data: dict[str, Any] = Field(default_factory=dict)
    scene: dict[str, Any] = Field(default_factory=dict)
    preview_video: str | None = None
    model_assets: dict[str, str | None] = Field(default_factory=dict)
    created_at: str
    updated_at: str
    last_opened_at: str | None = None
    share_url: str | None = None
