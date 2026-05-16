import logging
import time
import os
from bson import ObjectId
from pymongo.errors import PyMongoError
from app.database import database
from app.core.database import model_light_style_overrides_collection
from app.utils.helpers import utcnow

logger = logging.getLogger(__name__)
CDN_BASE = os.getenv("CDN_BASE", "").rstrip("/")
B2_PUBLIC_URL = os.getenv("B2_PUBLIC_URL", "").rstrip("/")

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
LIGHT_STYLE_KEYWORDS = ("light", "lamp", "chandelier", "pendant", "sconce", "lantern")


def _normalize_light_settings(settings: dict | None) -> dict:
    source = settings if isinstance(settings, dict) else {}
    offset = source.get("offset") if isinstance(source.get("offset"), list) else [0, 1.2, 0]
    normalized_offset = [
        float(offset[0]) if len(offset) > 0 else 0.0,
        float(offset[1]) if len(offset) > 1 else 1.2,
        float(offset[2]) if len(offset) > 2 else 0.0,
    ]
    return {
        "intensity": float(source.get("intensity", 1.1)),
        "color": str(source.get("color", "#FFF1D6")),
        "distance": float(source.get("distance", 7.0)),
        "type": "spot" if str(source.get("type", "point")).lower() == "spot" else "point",
        "offset": normalized_offset,
    }


def infer_emits_light(model: dict | None) -> bool:
    category = str((model or {}).get("category") or "").lower()
    name = str((model or {}).get("name") or "").lower()
    filename = str((model or {}).get("filename") or "").lower()
    haystack = f"{category} {name} {filename}"
    return any(keyword in haystack for keyword in LIGHT_STYLE_KEYWORDS)


def _merge_light_defaults(model: dict, override: dict | None = None) -> dict:
    normalized = dict(model)
    inferred_emits_light = infer_emits_light(normalized)
    emits_light = bool(
        override.get("emitsLight")
        if isinstance(override, dict) and override.get("emitsLight") is not None
        else normalized.get("emitsLight")
        if normalized.get("emitsLight") is not None
        else inferred_emits_light
    )
    default_light_active = bool(
        override.get("defaultLightActive")
        if isinstance(override, dict) and override.get("defaultLightActive") is not None
        else normalized.get("defaultLightActive")
        if normalized.get("defaultLightActive") is not None
        else emits_light
    )
    light_settings_source = (
        override.get("defaultLightSettings")
        if isinstance(override, dict) and isinstance(override.get("defaultLightSettings"), dict)
        else normalized.get("defaultLightSettings")
    )
    normalized["emitsLight"] = emits_light
    normalized["defaultLightActive"] = default_light_active
    normalized["defaultLightSettings"] = _normalize_light_settings(light_settings_source) if emits_light else None
    return normalized


async def _load_user_light_style_overrides(user_id: str | None) -> dict[str, dict]:
    if not user_id or not ObjectId.is_valid(user_id):
        return {}

    overrides: dict[str, dict] = {}
    try:
        cursor = model_light_style_overrides_collection.find({"user_id": ObjectId(user_id)})
        async for doc in cursor:
            filename = str(doc.get("filename") or "").strip()
            if not filename:
                continue
            overrides[filename] = {
                "emitsLight": doc.get("emitsLight"),
                "defaultLightActive": doc.get("defaultLightActive"),
                "defaultLightSettings": doc.get("defaultLightSettings"),
            }
    except PyMongoError as exc:
        logger.error("Loading user model light overrides failed: %s", exc)
        return {}
    return overrides


def _normalize_model_url(url: str | None, filename: str | None = None) -> str | None:
    if not url:
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url

    clean_url = url.lstrip("/")
    clean_filename = (filename or "").lstrip("/")

    if CDN_BASE and clean_filename:
        if clean_url == clean_filename:
            return f"{CDN_BASE}/{clean_filename}"
        if clean_url.endswith(clean_filename):
            return f"{CDN_BASE}/{clean_filename}"

    if B2_PUBLIC_URL and clean_filename:
        if clean_url == clean_filename:
            return f"{B2_PUBLIC_URL}/{clean_filename}"
        if clean_url.endswith(clean_filename):
            return f"{B2_PUBLIC_URL}/{clean_filename}"

    return url


def _normalize_model_record(doc: dict) -> dict:
    normalized = dict(doc)
    normalized["url"] = _normalize_model_url(normalized.get("url"), normalized.get("filename"))
    return normalized


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
            models.append(_normalize_model_record(doc))
    except PyMongoError as exc:
        logger.error("Model list failed because MongoDB is unavailable: %s", exc)
        if _list_cache is not None:
            return _list_cache
        return []

    _list_cache = models
    _list_cache_ts = now
    return models


async def list_models_with_light_defaults(user_id: str | None = None) -> list:
    models = await list_models()
    overrides = await _load_user_light_style_overrides(user_id)
    return [_merge_light_defaults(model, overrides.get(model.get("filename"))) for model in models]


async def get_manifest(user_id: str | None = None) -> list:
    """
    Return models sorted for optimal prefetch order:
      1. By category priority.
      2. By file size within the same category.
    """
    models = await list_models_with_light_defaults(user_id)
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
    emits_light: bool | None = None,
    default_light_active: bool | None = None,
    default_light_settings: dict | None = None,
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
    if emits_light is not None:
        fields["emitsLight"] = emits_light
    if default_light_active is not None:
        fields["defaultLightActive"] = default_light_active
    if default_light_settings is not None:
        fields["defaultLightSettings"] = _normalize_light_settings(default_light_settings)

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


async def upsert_user_model_light_style_override(
    *,
    user_id: str,
    filename: str,
    emits_light: bool,
    default_light_active: bool,
    default_light_settings: dict | None = None,
) -> dict:
    document = {
        "user_id": ObjectId(user_id),
        "filename": filename,
        "emitsLight": emits_light,
        "defaultLightActive": default_light_active,
        "defaultLightSettings": _normalize_light_settings(default_light_settings) if emits_light else None,
        "updated_at": utcnow(),
    }
    try:
        await model_light_style_overrides_collection.update_one(
            {"user_id": ObjectId(user_id), "filename": filename},
            {"$set": document, "$setOnInsert": {"created_at": utcnow()}},
            upsert=True,
        )
    except PyMongoError as exc:
        logger.error("Upserting user model light override failed: %s", exc)
        raise RuntimeError("Model light style override database is unavailable") from exc
    return {
        "filename": filename,
        "emitsLight": emits_light,
        "defaultLightActive": default_light_active,
        "defaultLightSettings": document["defaultLightSettings"],
    }
