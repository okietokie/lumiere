
# model_routes.py
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_current_user, get_current_user_optional
from app.services.model_service import (
    list_models_with_light_defaults, upsert_model, get_manifest, get_model_by_id, set_model_preview_url,
    upsert_user_model_light_style_override,
)
from app.services.preview_service import upload_preview_bytes

router = APIRouter()


class ModelUpsertRequest(BaseModel):
    name:       str
    filename:   str
    category:   str
    url:        str
    size_bytes: Optional[int] = None   
    emitsLight: Optional[bool] = None
    defaultLightActive: Optional[bool] = None
    defaultLightSettings: Optional[dict] = None


class ModelLightStyleOverrideRequest(BaseModel):
    filename: str
    emitsLight: bool
    defaultLightActive: bool
    defaultLightSettings: Optional[dict] = None


@router.get("/list")
async def get_models(current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Returns all models with their direct CDN/B2 URLs."""
    return await list_models_with_light_defaults(str(current_user["_id"]) if current_user else None)


@router.get("/manifest")
async def get_model_manifest(current_user: Optional[dict] = Depends(get_current_user_optional)):
    """
    Returns the model list enriched with:
      - size_bytes   (if recorded at upload time)
      - priority     (0-100, higher = prefetch sooner)
      - category

    The frontend uses this to:
      1. Sort models by priority so the most-used categories appear first.
      2. Prefetch models in the background, smallest files first, so
         the first visible thumbnails load fast.
    """
    return await get_manifest(str(current_user["_id"]) if current_user else None)


@router.post("/register")
async def register_model(body: ModelUpsertRequest):
    """Called by the upload script after uploading a file to B2."""
    model_id = await upsert_model(
        name=body.name,
        filename=body.filename,
        category=body.category,
        url=body.url,
        size_bytes=body.size_bytes,
        emits_light=body.emitsLight,
        default_light_active=body.defaultLightActive,
        default_light_settings=body.defaultLightSettings,
    )
    return {"id": model_id, "url": body.url}


@router.put("/light-style")
async def update_model_light_style_override(
    body: ModelLightStyleOverrideRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        return await upsert_user_model_light_style_override(
            user_id=str(current_user["_id"]),
            filename=body.filename,
            emits_light=body.emitsLight,
            default_light_active=body.defaultLightActive,
            default_light_settings=body.defaultLightSettings,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/{model_id}/preview")
async def upload_model_preview(model_id: str, file: UploadFile = File(...)):
    model = await get_model_by_id(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty preview file")

    content_type = file.content_type or "image/webp"
    if "/" in content_type:
        extension = content_type.split("/")[-1]
    else:
        extension = "webp"

    try:
        preview_path, preview_url = upload_preview_bytes(
            model_filename=model["filename"],
            data=content,
            content_type=content_type,
            extension=extension,
        )
        await set_model_preview_url(model_id, preview_url)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not upload preview: {exc}")

    return {"preview_path": preview_path, "preview_url": preview_url}

