# models/project_model.py
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.utils.helpers import utcnow


class ProjectDocument(BaseModel):
    user_id: str
    title: str
    thumbnail_url: str | None = None
    scene_data: dict[str, Any] = Field(default_factory=dict)
    preview_video: str | None = None
    model_assets: dict[str, str | None] = Field(
        default_factory=lambda: {
            "glb_url": None,
            "usdz_url": None,
            "glb_filename": None,
            "usdz_filename": None,
        }
    )
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    last_opened_at: datetime | None = None
