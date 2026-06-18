from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
import base64
import hashlib
import os

import bcrypt
import certifi
import jwt
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import PyMongoError


# Minimal config context from app/core/config.py
ROOT_ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(ROOT_ENV_FILE)

MONGO_URI = os.getenv("MONGO_URI")
LOCAL_MONGO_URI = os.getenv("LOCAL_MONGO_URI", "mongodb://127.0.0.1:27017")
MONGO_FALLBACK_ENABLED = os.getenv("MONGO_FALLBACK_ENABLED", "true").lower() in {"1", "true", "yes", "on"}
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "lumiere")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY") or "lumiere-dev-secret"
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))


def utcnow() -> datetime:
    return datetime.utcnow()


def serialize_document(value: Any) -> Any:
    if isinstance(value, list):
        return [serialize_document(item) for item in value]
    if isinstance(value, dict):
        result: dict[str, Any] = {}
        for key, item in value.items():
            result["id" if key == "_id" else key] = serialize_document(item)
        return result
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _is_local_mongo_uri(uri: str) -> bool:
    parsed = urlparse(uri)
    return (parsed.hostname or "").lower() in {"localhost", "127.0.0.1", "::1"}


def _build_client(uri: str) -> AsyncIOMotorClient:
    options: dict[str, Any] = {"serverSelectionTimeoutMS": 5000}
    if not _is_local_mongo_uri(uri):
        options["tls"] = True
        options["tlsCAFile"] = certifi.where()
    return AsyncIOMotorClient(uri, **options)


def _candidate_uris() -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    if MONGO_URI:
        candidates.append(("primary", MONGO_URI))
    if MONGO_FALLBACK_ENABLED and LOCAL_MONGO_URI and LOCAL_MONGO_URI != MONGO_URI:
        candidates.append(("local-fallback", LOCAL_MONGO_URI))
    return candidates


_mongo_candidates = _candidate_uris()
if not _mongo_candidates:
    raise RuntimeError("MongoDB is not configured.")

_active_client = _build_client(_mongo_candidates[0][1])
_active_database = _active_client[MONGO_DB_NAME]

users_collection = _active_database["users"]
projects_collection = _active_database["projects"]
model_light_style_overrides_collection = _active_database["model_light_style_overrides"]

security_scheme = HTTPBearer()
_jwt_handler = getattr(jwt, "JWT", None)
_jwk_from_dict = getattr(jwt, "jwk_from_dict", None)

try:
    from jwt import InvalidTokenError as JWTInvalidTokenError
except ImportError:
    JWTInvalidTokenError = Exception


class ProjectDocument:
    """Minimal project document shape used by the create flow."""

    @staticmethod
    def build(user_id: str, title: str, scene_data: dict[str, Any], thumbnail_url: str | None) -> dict[str, Any]:
        now = utcnow()
        return {
            "user_id": ObjectId(user_id),
            "title": title,
            "thumbnail_url": thumbnail_url,
            "scene_data": scene_data,
            "preview_video": None,
            "model_assets": {
                "glb_url": None,
                "usdz_url": None,
                "glb_filename": None,
                "usdz_filename": None,
            },
            "created_at": now,
            "updated_at": now,
            "last_opened_at": now,
        }


# 1. Database connection with production/local fallback.
async def connect_database() -> bool:
    global _active_client, _active_database, users_collection, projects_collection, model_light_style_overrides_collection

    for _, uri in _mongo_candidates:
        next_client = _build_client(uri)
        try:
            await next_client.admin.command("ping")
        except PyMongoError:
            next_client.close()
            continue

        if _active_client is not next_client:
            _active_client.close()

        _active_client = next_client
        _active_database = next_client[MONGO_DB_NAME]
        users_collection = _active_database["users"]
        projects_collection = _active_database["projects"]
        model_light_style_overrides_collection = _active_database["model_light_style_overrides"]
        return True

    return False


# 2. Database indexes that enforce core constraints and query performance.
async def ensure_indexes() -> None:
    await users_collection.create_index([("email", ASCENDING)], unique=True)
    await projects_collection.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
    await projects_collection.create_index([("user_id", ASCENDING), ("last_opened_at", DESCENDING)])
    await model_light_style_overrides_collection.create_index(
        [("user_id", ASCENDING), ("filename", ASCENDING)],
        unique=True,
    )


# 3. Password hashing used by registration and password resets.
def hash_password(password: str) -> str:
    normalized = base64.b64encode(hashlib.sha256(password.encode("utf-8")).digest())
    return bcrypt.hashpw(normalized, bcrypt.gensalt()).decode("utf-8")


# 4. JWT creation for authenticated frontend sessions.
def create_access_token(*, user_id: str, email: str, name: str | None = None) -> str:
    expires_at = utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "name": name, "exp": expires_at}

    if callable(getattr(jwt, "encode", None)):
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    if _jwt_handler and _jwk_from_dict:
        encoded_secret = base64.urlsafe_b64encode(JWT_SECRET_KEY.encode("utf-8")).rstrip(b"=")
        signing_key = _jwk_from_dict({"kty": "oct", "k": encoded_secret.decode("ascii")})
        return _jwt_handler().encode({**payload, "exp": int(expires_at.timestamp())}, signing_key, alg=JWT_ALGORITHM)

    raise RuntimeError("No compatible JWT implementation is installed")


# 5. Auth guard that validates the bearer token and loads the current user.
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict[str, Any]:
    try:
        if callable(getattr(jwt, "decode", None)):
            payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        elif _jwt_handler and _jwk_from_dict:
            encoded_secret = base64.urlsafe_b64encode(JWT_SECRET_KEY.encode("utf-8")).rstrip(b"=")
            verification_key = _jwk_from_dict({"kty": "oct", "k": encoded_secret.decode("ascii")})
            payload = _jwt_handler().decode(credentials.credentials, verification_key, algorithms={JWT_ALGORITHM})
        else:
            raise RuntimeError("No compatible JWT implementation is installed")
    except JWTInvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    user_id = payload.get("sub")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# 6. Project creation flow, including canonical document shape and serialization.
async def create_project(
    *,
    user_id: str,
    title: str | None = None,
    scene_data: dict[str, Any] | None = None,
    thumbnail_url: str | None = None,
) -> dict[str, Any]:
    title_value = (title or "Untitled Room").strip() or "Untitled Room"
    document = ProjectDocument.build(
        user_id=user_id,
        title=title_value,
        scene_data=scene_data or {},
        thumbnail_url=thumbnail_url,
    )
    result = await projects_collection.insert_one(document)
    document["_id"] = result.inserted_id
    serialized = serialize_document(document)
    serialized["name"] = serialized["title"]
    serialized["scene"] = serialized["scene_data"]
    return serialized
