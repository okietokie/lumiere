import os
import secrets
import logging
import base64
import hashlib
import bcrypt
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from bson import ObjectId
from pymongo.errors import PyMongoError

# Internal imports - Ensure these paths match your project exactly
from app.models.user import UserCreate, UserResponse
from app.database import user_collection

router = APIRouter()
logger = logging.getLogger(__name__)

def _normalize_password(password: str) -> bytes:
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    normalized = _normalize_password(password)
    return bcrypt.hashpw(normalized, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    normalized = _normalize_password(password)
    return bcrypt.checkpw(normalized, hashed_password.encode("utf-8"))

def get_mail_config() -> ConnectionConfig:
    required_env = {
        "MAIL_USERNAME": os.getenv("MAIL_USERNAME"),
        "MAIL_PASSWORD": os.getenv("MAIL_PASSWORD"),
        "MAIL_FROM": os.getenv("MAIL_FROM"),
        "MAIL_SERVER": os.getenv("MAIL_SERVER"),
    }
    missing = [key for key, value in required_env.items() if not value]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service is not configured."
        )

    return ConnectionConfig(
        MAIL_USERNAME=required_env["MAIL_USERNAME"],
        MAIL_PASSWORD=required_env["MAIL_PASSWORD"],
        MAIL_FROM=required_env["MAIL_FROM"],
        MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
        MAIL_SERVER=required_env["MAIL_SERVER"],
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True,
    )

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    try:
        # 1. Check if user already exists
        existing_user = await user_collection.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

        # 2. Hash the password
        hashed_password = hash_password(user.password)

        # 3. Prepare Database Document
        user_dict = {
            "name": user.name,
            "email": user.email,
            "hashed_password": hashed_password,
            "created_at": datetime.utcnow()
        }

        # 4. Save to MongoDB
        result = await user_collection.insert_one(user_dict)
        return {
            "id": str(result.inserted_id),
            "name": user.name,
            "email": user.email,
            "created_at": user_dict["created_at"]
        }
    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"Registration Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable. Please check the MongoDB connection and try again."
        )

@router.post("/login")
async def login(user_data: dict):
    email = user_data.get("email")
    password = user_data.get("password")

    try:
        user = await user_collection.find_one({"email": email})

        if not user or not verify_password(password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        return {
            "message": "Login successful",
            "user_id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email")
        }
    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"Login Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable. Please check the MongoDB connection and try again."
        )

@router.post("/forgot-password")
async def forgot_password(request_data: dict, background_tasks: BackgroundTasks):
    email = request_data.get("email")

    try:
        user = await user_collection.find_one({"email": email})

        # Standard security response to prevent email harvesting
        response_msg = {"message": "If an account exists, a reset link has been sent."}

        if user:
            # 1. Generate Token and Expiry
            token = secrets.token_urlsafe(32)
            expiry = datetime.utcnow() + timedelta(minutes=15)

            # 2. Save to DB
            await user_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"reset_token": token, "reset_expiry": expiry}}
            )

            # 3. Prepare Email
            reset_link = f"http://localhost:5173/reset-password?token={token}"
            html = f"""
            <h3>Lumiere Password Reset</h3>
            <p>Click the link below to reset your password. This link is valid for 15 minutes.</p>
            <a href='{reset_link}'>{reset_link}</a>
            """

            message = MessageSchema(
                subject="Lumiere Password Reset",
                recipients=[email],
                body=html,
                subtype=MessageType.html
            )

            # 4. Send email in background
            fm = FastMail(get_mail_config())
            background_tasks.add_task(fm.send_message, message)

        return response_msg
    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"Forgot Password Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable. Please check the MongoDB connection and try again."
        )

@router.post("/reset-password-confirm")
async def reset_password_confirm(data: dict):
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and password are required")

    try:
        # Validate token and check if expiry is in the future
        user = await user_collection.find_one({
            "reset_token": token, 
            "reset_expiry": {"$gt": datetime.utcnow()}
        })

        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired token")

        # Update password and clear reset fields
        hashed_password = hash_password(new_password)
        await user_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"hashed_password": hashed_password},
                "$unset": {"reset_token": "", "reset_expiry": ""}
            }
        )
        return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"Reset Password Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable. Please check the MongoDB connection and try again."
        )
