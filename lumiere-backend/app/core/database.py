import logging
from typing import Any
from urllib.parse import urlparse

import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import PyMongoError

from app.core.config import LOCAL_MONGO_URI, MONGO_DB_NAME, MONGO_FALLBACK_ENABLED, MONGO_URI

logger = logging.getLogger(__name__)


def _is_local_mongo_uri(uri: str) -> bool:
    parsed = urlparse(uri)
    hostname = (parsed.hostname or "").lower()
    return hostname in {"localhost", "127.0.0.1", "::1"}


def _build_client(uri: str) -> AsyncIOMotorClient:
    options: dict[str, Any] = {
        "serverSelectionTimeoutMS": 5000,
    }
    if not _is_local_mongo_uri(uri):
        options["tls"] = True
        options["tlsCAFile"] = certifi.where()
    return AsyncIOMotorClient(uri, **options)


class AsyncDatabaseProxy:
    def __init__(self, getter):
        self._getter = getter

    def __getitem__(self, name: str):
        return self._getter()[name]

    def __getattr__(self, name: str):
        return getattr(self._getter(), name)


class AsyncCollectionProxy:
    def __init__(self, database_proxy: AsyncDatabaseProxy, collection_name: str):
        self._database_proxy = database_proxy
        self._collection_name = collection_name

    def _collection(self):
        return self._database_proxy[self._collection_name]

    def __getattr__(self, name: str):
        return getattr(self._collection(), name)


def _candidate_uris() -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    if MONGO_URI:
        candidates.append(("primary", MONGO_URI))
    if MONGO_FALLBACK_ENABLED and LOCAL_MONGO_URI and LOCAL_MONGO_URI != MONGO_URI:
        candidates.append(("local-fallback", LOCAL_MONGO_URI))
    return candidates


_mongo_candidates = _candidate_uris()
if not _mongo_candidates:
    raise RuntimeError(
        "MongoDB is not configured. Set MONGO_URI or enable LOCAL_MONGO_URI for local fallback."
    )

_active_client = _build_client(_mongo_candidates[0][1])
_active_database = _active_client[MONGO_DB_NAME]
_active_label = _mongo_candidates[0][0]
_active_uri = _mongo_candidates[0][1]

database = AsyncDatabaseProxy(lambda: _active_database)
users_collection = AsyncCollectionProxy(database, "users")
projects_collection = AsyncCollectionProxy(database, "projects")
design_collection = AsyncCollectionProxy(database, "designs")
model_light_style_overrides_collection = AsyncCollectionProxy(database, "model_light_style_overrides")
client = _active_client


async def connect_database() -> bool:
    global _active_client, _active_database, _active_label, _active_uri, client

    last_error: PyMongoError | None = None

    for label, uri in _mongo_candidates:
        next_client = _build_client(uri)
        try:
            await next_client.admin.command("ping")
        except PyMongoError as exc:
            last_error = exc
            logger.warning("MongoDB connection failed for %s (%s): %s", label, uri, exc)
            next_client.close()
            continue

        if _active_client is not next_client:
            _active_client.close()

        _active_client = next_client
        _active_database = next_client[MONGO_DB_NAME]
        _active_label = label
        _active_uri = uri
        client = next_client
        logger.info("MongoDB connected using %s (%s)", label, uri)
        return True

    if last_error:
        logger.error("All MongoDB connection attempts failed: %s", last_error)
    return False


async def ping_database() -> bool:
    try:
        await _active_client.admin.command("ping")
        return True
    except PyMongoError as exc:
        logger.error("MongoDB ping failed: %s", exc)
        return False


def get_active_database_label() -> str:
    return _active_label


def get_active_database_uri() -> str:
    return _active_uri


def close_database() -> None:
    _active_client.close()


async def ensure_indexes() -> None:
    await users_collection.create_index([("email", ASCENDING)], unique=True)
    await projects_collection.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
    await projects_collection.create_index([("user_id", ASCENDING), ("last_opened_at", DESCENDING)])
    await model_light_style_overrides_collection.create_index(
        [("user_id", ASCENDING), ("filename", ASCENDING)],
        unique=True,
    )
