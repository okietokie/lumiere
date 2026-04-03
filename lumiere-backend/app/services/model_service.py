import logging
import time
from pymongo.errors import PyMongoError
from app.database import database

logger = logging.getLogger(__name__)

# Prioritizes frequently placed categories during manifest sorting.
CATEGORY_PRIORITY: dict[str, int] = {
    "sofa": 95,
    "sofas": 95,
    "chair": 90,
    "chairs": 90,
    "table": 85,
    "tables": 85,
    "bed": 80,
    "beds": 80,
    "lamp": 70,
    "lamps": 70,
    "cupboard": 65,
    "cupboards": 65,
    "chandelier": 55,
    "curtain": 50,
    "curtains": 50,
    "window": 45,
    "windows": 45,
    "stair": 40,
    "others": 30,
    "uncategorized": 20,
}

# Caches the model list briefly to reduce repeated database reads.
_list_cache: list | None = None
_list_cache_ts: float = 0.0
LIST_CACHE_TTL = 60.0


async def list_models() -> list:
    """Return all models that have a valid CDN/B2 URL. Cached for 60 s."""
    global _list_cache, _list_cache_ts
    now = time.monotonic()
    if _list_cache is not None and (now - _list_cache_ts) < LIST_CACHE_TTL:
        return _list_cache

    models = []
    try:
        cursor = database["models"].find()
        async for doc in cursor:
            if not doc.get("url"):
                continue
            doc["id"] = str(doc.pop("_id"))
            models.append(doc)
    except PyMongoError as exc:
        logger.error("Model list failed because MongoDB is unavailable: %s", exc)
        if _list_cache is not None:
            return _list_cache
        return []

    _list_cache = models
    _list_cache_ts = now
    return models


async def get_manifest() -> list:
    """
    Return models sorted for optimal prefetch order:
      1. By category priority.
      2. By file size within the same category.
    """
    models = await list_models()
    enriched = []
    for m in models:
        cat = (m.get("category") or "uncategorized").lower()
        priority = CATEGORY_PRIORITY.get(cat, 20)
        size = m.get("size_bytes") or 999_999_999
        enriched.append({**m, "priority": priority, "size_bytes": size})

    enriched.sort(key=lambda x: (-x["priority"], x["size_bytes"]))
    return enriched


async def get_model_by_filename(filename: str) -> dict | None:
    try:
        doc = await database["models"].find_one({"filename": filename})
    except PyMongoError as exc:
        logger.error("Model lookup by filename failed: %s", exc)
        return None
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


async def get_model_by_id(model_id: str) -> dict | None:
    from bson import ObjectId

    try:
        oid = ObjectId(model_id)
    except Exception:
        return None

    try:
        doc = await database["models"].find_one({"_id": oid})
    except PyMongoError as exc:
        logger.error("Model lookup by id failed: %s", exc)
        return None
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


async def set_model_preview_url(model_id: str, preview_url: str) -> bool:
    from bson import ObjectId

    global _list_cache
    _list_cache = None

    try:
        oid = ObjectId(model_id)
    except Exception:
        return False

    try:
        result = await database["models"].update_one(
            {"_id": oid},
            {"$set": {"preview_url": preview_url}},
        )
    except PyMongoError as exc:
        logger.error("Setting model preview failed: %s", exc)
        return False
    return result.matched_count > 0


async def upsert_model(
    name: str,
    filename: str,
    category: str,
    url: str,
    size_bytes: int | None = None,
) -> str:
    """Insert or update a model record. Called by the upload script."""
    global _list_cache
    _list_cache = None

    fields: dict = {
        "name": name,
        "filename": filename,
        "category": category,
        "url": url,
    }
    if size_bytes is not None:
        fields["size_bytes"] = size_bytes

    try:
        result = await database["models"].update_one(
            {"filename": filename},
            {"$set": fields},
            upsert=True,
        )
    except PyMongoError as exc:
        logger.error("Upserting model failed: %s", exc)
        raise RuntimeError("Model database is unavailable") from exc
    if result.upserted_id:
        return str(result.upserted_id)
    try:
        doc = await database["models"].find_one({"filename": filename})
    except PyMongoError as exc:
        logger.error("Reloading model after upsert failed: %s", exc)
        raise RuntimeError("Model database is unavailable") from exc
    return str(doc["_id"])
