# app/routes/model_routes.py
# B2 edition — no file serving, models are fetched directly from B2 by the browser.
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.model_service import list_models, upsert_model

router = APIRouter()


class ModelUpsertRequest(BaseModel):
    name:     str
    filename: str
    category: str
    url:      str


@router.get("/list")
async def get_models():
    """Returns all models with their direct B2 URLs."""
    return await list_models()


@router.post("/register")
async def register_model(body: ModelUpsertRequest):
    """Called by the upload script after uploading a file to B2."""
    model_id = await upsert_model(
        name=body.name, filename=body.filename,
        category=body.category, url=body.url,
    )
    return {"id": model_id, "url": body.url}