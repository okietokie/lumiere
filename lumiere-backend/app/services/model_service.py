# app/services/model_service.py
# Cloudflare B2 edition — models are stored on Backblaze B2.
# No local downloads. No Mega. No background tasks.
# Each model document has a "url" field pointing directly to B2.
import logging
from app.database import database

logger = logging.getLogger(__name__)


async def list_models():
    """Return only models that have a valid B2 url field."""
    cursor = database["models"].find()
    models = []
    async for doc in cursor:
        if not doc.get("url"):
            continue  # skip legacy docs without a url
        doc["id"] = str(doc.pop("_id"))
        models.append(doc)
    return models


async def get_model_by_filename(filename: str) -> dict | None:
    doc = await database["models"].find_one({"filename": filename})
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


async def upsert_model(name: str, filename: str, category: str, url: str) -> str:
    """Insert or update a model record. Called by the upload script."""
    result = await database["models"].update_one(
        {"filename": filename},
        {"$set": {"name": name, "filename": filename, "category": category, "url": url}},
        upsert=True,
    )
    if result.upserted_id:
        return str(result.upserted_id)
    doc = await database["models"].find_one({"filename": filename})
    return str(doc["_id"])