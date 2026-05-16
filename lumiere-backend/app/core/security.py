import base64
import hashlib
from datetime import timedelta

import bcrypt
import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_ALGORITHM, JWT_SECRET_KEY
from app.core.database import users_collection
from app.utils.helpers import utcnow

security_scheme = HTTPBearer()
_jwt_handler = getattr(jwt, "JWT", None)
_jwk_from_dict = getattr(jwt, "jwk_from_dict", None)

try:
    from jwt import InvalidTokenError as JWTInvalidTokenError
except ImportError:
    try:
        from jwt.exceptions import JWTDecodeError as JWTInvalidTokenError
    except ImportError:
        JWTInvalidTokenError = Exception


def _shared_secret_jwk() -> dict[str, str]:
    encoded_secret = base64.urlsafe_b64encode(JWT_SECRET_KEY.encode("utf-8")).rstrip(b"=")
    return {"kty": "oct", "k": encoded_secret.decode("ascii")}


def _normalize_password(password: str) -> bytes:
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_normalize_password(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(_normalize_password(password), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def verify_password_legacy(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(*, user_id: str, email: str, name: str | None = None) -> str:
    expires_at = utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "name": name, "exp": expires_at}

    if callable(getattr(jwt, "encode", None)):
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    if _jwt_handler and _jwk_from_dict:
        signing_key = _jwk_from_dict(_shared_secret_jwk())
        fallback_payload = {
            **payload,
            "exp": int(expires_at.timestamp()),
        }
        return _jwt_handler().encode(fallback_payload, signing_key, alg=JWT_ALGORITHM)

    raise RuntimeError("No compatible JWT implementation is installed")


def decode_access_token(token: str) -> dict:
    try:
        if callable(getattr(jwt, "decode", None)):
            return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])

        if _jwt_handler and _jwk_from_dict:
            verification_key = _jwk_from_dict(_shared_secret_jwk())
            return _jwt_handler().decode(token, verification_key, algorithms={JWT_ALGORITHM})

        raise RuntimeError("No compatible JWT implementation is installed")
    except JWTInvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict:
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_current_user_optional(request: Request) -> dict | None:
    auth_header = request.headers.get("authorization", "").strip()
    if not auth_header.lower().startswith("bearer "):
        return None

    token = auth_header[7:].strip()
    if not token:
        return None

    try:
        payload = decode_access_token(token)
    except HTTPException:
        return None

    user_id = payload.get("sub")
    if not user_id or not ObjectId.is_valid(user_id):
        return None

    return await users_collection.find_one({"_id": ObjectId(user_id)})
