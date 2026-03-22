# app/services/model_service.py
# Performance edition.
#
# Changes vs original:
#   - upsert_model now accepts and stores size_bytes
#   - get_manifest() returns models sorted by priority score
#   - list_models() result is cached in-process for 60 s to avoid hammering MongoDB
#     on every furniture-tab open

import logging
import time
from app.database import database

logger = logging.getLogger(__name__)

# ── Category priority scores ───────────────────────────────────────────────────
# Higher score = prefetch sooner. Based on typical usage frequency.
# Chairs and sofas are placed most often so they load first.
CATEGORY_PRIORITY: dict[str, int] = {
    "sofa":       95,
    "sofas":      95,
    "chair":      90,
    "chairs":     90,
    "table":      85,
    "tables":     85,
    "bed":        80,
    "beds":       80,
    "lamp":       70,
    "lamps":      70,
    "cupboard":   65,
    "cupboards":  65,
    "chandelier": 55,
    "curtain":    50,
    "curtains":   50,
    "window":     45,
    "windows":    45,
    "stair":      40,
    "others":     30,
    "uncategorized": 20,
}

# ── In-process list cache (avoids repeated MongoDB round-trips) ────────────────
_list_cache: list | None      = None
_list_cache_ts: float         = 0.0
LIST_CACHE_TTL                = 60.0   # seconds


async def list_models() -> list:
    """Return all models that have a valid CDN/B2 URL. Cached for 60 s."""
    global _list_cache, _list_cache_ts
    now = time.monotonic()
    if _list_cache is not None and (now - _list_cache_ts) < LIST_CACHE_TTL:
        return _list_cache

    cursor = database["models"].find()
    models = []
    async for doc in cursor:
        if not doc.get("url"):
            continue
        doc["id"] = str(doc.pop("_id"))
        models.append(doc)

    _list_cache    = models
    _list_cache_ts = now
    return models


async def get_manifest() -> list:
    """
    Return models sorted for optimal prefetch order:
      1. By category priority (descending) — high-traffic categories first
      2. By size_bytes (ascending) — smaller files first within same category

    This means the frontend can prefetch in manifest order and get the most
    impactful models ready with the least bytes transferred first.
    """
    models = await list_models()
    enriched = []
    for m in models:
        cat      = (m.get("category") or "uncategorized").lower()
        priority = CATEGORY_PRIORITY.get(cat, 20)
        size     = m.get("size_bytes") or 999_999_999  # unknown size sorts last
        enriched.append({**m, "priority": priority, "size_bytes": size})

    # Sort: highest priority first, then smallest file first
    enriched.sort(key=lambda x: (-x["priority"], x["size_bytes"]))
    return enriched


async def get_model_by_filename(filename: str) -> dict | None:
    doc = await database["models"].find_one({"filename": filename})
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


async def upsert_model(
    name: str,
    filename: str,
    category: str,
    url: str,
    size_bytes: int | None = None,
) -> str:
    """Insert or update a model record. Called by the upload script."""
    global _list_cache  # invalidate cache on write
    _list_cache = None

    fields: dict = {
        "name":     name,
        "filename": filename,
        "category": category,
        "url":      url,
    }
    if size_bytes is not None:
        fields["size_bytes"] = size_bytes

    result = await database["models"].update_one(
        {"filename": filename},
        {"$set": fields},
        upsert=True,
    )
    if result.upserted_id:
        return str(result.upserted_id)
    doc = await database["models"].find_one({"filename": filename})
    return str(doc["_id"])