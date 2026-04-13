from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.schemas.scene_schema import SceneData


ScenePayload = SceneData | dict[str, Any]


def _scene_payload_to_dict(value: ScenePayload | None) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, BaseModel):
        return value.model_dump(exclude_none=True)
    return value


class SaveProjectRequest(BaseModel):
    title: str | None = None
    name: str | None = None
    scene_data: ScenePayload | None = None
    scene: ScenePayload | None = None
    thumbnail_url: str | None = None
    thumbnail: str | None = None

    @field_validator("scene_data", "scene", mode="after")
    @classmethod
    def serialize_scene_payload(cls, value: ScenePayload | None) -> dict[str, Any] | None:
        return _scene_payload_to_dict(value)


class UpdateProjectRequest(BaseModel):
    title: str | None = None
    name: str | None = None
    scene_data: ScenePayload | None = None
    scene: ScenePayload | None = None
    thumbnail_url: str | None = None
    thumbnail: str | None = None

    @field_validator("scene_data", "scene", mode="after")
    @classmethod
    def serialize_scene_payload(cls, value: ScenePayload | None) -> dict[str, Any] | None:
        return _scene_payload_to_dict(value)


class ProjectResponse(BaseModel):
    id: str
    title: str
    name: str
    thumbnail_url: str | None = None
    scene_data: ScenePayload = Field(default_factory=dict)
    scene: ScenePayload = Field(default_factory=dict)
    preview_video: str | None = None
    model_assets: dict[str, str | None] = Field(default_factory=dict)
    created_at: str
    updated_at: str
    last_opened_at: str | None = None
    share_url: str | None = None
