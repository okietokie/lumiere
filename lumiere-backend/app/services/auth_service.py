from datetime import timedelta

from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.database import users_collection
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.auth_schema import UserCreateRequest
from app.utils.helpers import serialize_document, utcnow


def serialize_user(user: dict) -> dict:
    serialized = serialize_document(user)
    serialized.pop("password_hash", None)
    serialized.pop("hashed_password", None)
    serialized.pop("reset_token", None)
    serialized.pop("reset_expiry", None)
    return serialized


async def get_user_by_email(email: str) -> dict | None:
    return await users_collection.find_one({"email": email.lower().strip()})


async def create_user(payload: UserCreateRequest) -> dict:
    now = utcnow()
    doc = {
        "name": payload.name,
        "email": payload.email.lower().strip(),
        "password_hash": hash_password(payload.password),
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await users_collection.insert_one(doc)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        ) from exc
    doc["_id"] = result.inserted_id
    return serialize_user(doc)


async def authenticate_user(email: str, password: str) -> dict:
    user = await get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    stored_hash = user.get("password_hash") or user.get("hashed_password")
    if not stored_hash or not verify_password(password, stored_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return user


def build_auth_response(user: dict) -> dict:
    serialized_user = serialize_user(user)
    token = create_access_token(
        user_id=serialized_user["id"],
        email=serialized_user["email"],
        name=serialized_user.get("name"),
    )
    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": serialized_user,
    }


async def store_reset_token(user_id, token: str, expires_in_minutes: int) -> None:
    expiry = utcnow() + timedelta(minutes=expires_in_minutes)
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {"reset_token": token, "reset_expiry": expiry, "updated_at": utcnow()}},
    )


async def update_password_with_reset_token(token: str, new_password: str) -> bool:
    user = await users_collection.find_one(
        {
            "reset_token": token,
            "reset_expiry": {"$gt": utcnow()},
        }
    )
    if not user:
        return False

    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password_hash": hash_password(new_password), "updated_at": utcnow()},
            "$unset": {"reset_token": "", "reset_expiry": "", "hashed_password": ""},
        },
    )
    return True
