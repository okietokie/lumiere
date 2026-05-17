# scene_schema.py
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.budget_schema import SceneBudget


class SceneElementMeasurements(BaseModel):
    model_config = ConfigDict(extra="allow")

    quantity: float | None = None
    width: float | None = None
    depth: float | None = None
    height: float | None = None
    length: float | None = None
    areaSqm: float | None = None
    floorAreaSqm: float | None = None
    ceilingAreaSqm: float | None = None
    doorCount: int | None = None
    windowCount: int | None = None
    scale: list[float] | None = None


class SceneRoom(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    name: str | None = None
    label: str | None = None
    type: str | None = None
    x: float | None = None
    z: float | None = None
    width: float | None = None
    depth: float | None = None
    height: float | None = None
    footprint: list[list[float]] | None = None
    isCustomShape: bool | None = None
    measurements: SceneElementMeasurements | None = None


class SceneOpening(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    type: str
    roomId: str | None = None
    wallId: str | None = None
    label: str | None = None
    width: float | None = None
    height: float | None = None
    measurements: SceneElementMeasurements | None = None


class SceneWall(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    type: str | None = "wall"
    roomId: str | None = None
    start: list[float]
    end: list[float]
    height: float | None = None
    thickness: float | None = None
    doors: list[SceneOpening] = Field(default_factory=list)
    windows: list[SceneOpening] = Field(default_factory=list)
    measurements: SceneElementMeasurements | None = None


class SceneFurniture(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    type: str | None = None
    roomId: str | None = None
    name: str | None = None
    label: str | None = None
    category: str | None = None
    position: list[float] | None = None
    rotation: list[float] | None = None
    scale: list[float] | None = None
    measurements: SceneElementMeasurements | None = None


class SceneLight(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    type: str
    budgetCategory: str | None = None
    quantity: float | None = None
    roomId: str | None = None
    label: str | None = None
    position: list[float] | None = None
    intensity: float | None = None
    measurements: SceneElementMeasurements | None = None


class SceneLighting(BaseModel):
    model_config = ConfigDict(extra="allow")

    placedLights: list[SceneLight] = Field(default_factory=list)


class SceneData(BaseModel):
    model_config = ConfigDict(extra="allow")

    version: str | None = None
    savedAt: str | None = None
    rooms: list[SceneRoom] = Field(default_factory=list)
    walls: list[SceneWall] = Field(default_factory=list)
    furniture: list[SceneFurniture] = Field(default_factory=list)
    placedItems: list[SceneFurniture] | None = None
    materials: dict[str, Any] = Field(default_factory=dict)
    floorMaterial: dict[str, Any] | None = None
    ceilingMaterial: dict[str, Any] | None = None
    lighting: SceneLighting | None = None
    budget: SceneBudget = Field(default_factory=SceneBudget)
