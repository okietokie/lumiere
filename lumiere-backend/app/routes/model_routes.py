# app/routes/model_routes.py
# Performance edition.
#
# New endpoints:
#   GET /api/models/manifest  — full model list with size_bytes + priority score.
#                               Frontend uses this to prefetch small/priority models first.
#   GET /api/models/list      — unchanged, returns all models with B2/CDN URLs.
#   POST /api/models/register — unchanged, called by upload script.

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from typing import Optional
from app.services.model_service import (
    list_models, upsert_model, get_manifest, get_model_by_id, set_model_preview_url,
)
from app.services.preview_service import upload_preview_bytes

router = APIRouter()


class ModelUpsertRequest(BaseModel):
    name:       str
    filename:   str
    category:   str
    url:        str
    size_bytes: Optional[int] = None   # filled in by upload script if available


@router.get("/list")
async def get_models():
    """Returns all models with their direct CDN/B2 URLs."""
    return await list_models()


@router.get("/manifest")
async def get_model_manifest():
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
    return await get_manifest()


@router.post("/register")
async def register_model(body: ModelUpsertRequest):
    """Called by the upload script after uploading a file to B2."""
    model_id = await upsert_model(
        name=body.name,
        filename=body.filename,
        category=body.category,
        url=body.url,
        size_bytes=body.size_bytes,
    )
    return {"id": model_id, "url": body.url}


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
