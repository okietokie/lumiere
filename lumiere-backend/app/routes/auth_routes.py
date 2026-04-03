import os
import secrets

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.core.config import FRONTEND_URL
from app.core.security import get_current_user
from app.schemas.auth_schema import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordConfirmRequest,
    UserCreateRequest,
    UserResponse,
)
from app.services.auth_service import (
    authenticate_user,
    build_auth_response,
    create_user,
    get_user_by_email,
    serialize_user,
    store_reset_token,
    update_password_with_reset_token,
)

router = APIRouter()


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
            detail="Email service is not configured.",
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
async def register(user: UserCreateRequest):
    existing_user = await get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )
    return await create_user(user)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    user = await authenticate_user(payload.email, payload.password)
    return build_auth_response(user)


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return serialize_user(current_user)


@router.post("/forgot-password")
async def forgot_password(request_data: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    user = await get_user_by_email(request_data.email)
    response_msg = {"message": "If an account exists, a reset link has been sent."}

    if user:
        token = secrets.token_urlsafe(32)
        await store_reset_token(user["_id"], token, 15)

        reset_link = f"{FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        html = (
            "<h3>Lumiere Password Reset</h3>"
            "<p>Click the link below to reset your password. This link is valid for 15 minutes.</p>"
            f"<a href='{reset_link}'>{reset_link}</a>"
        )

        message = MessageSchema(
            subject="Lumiere Password Reset",
            recipients=[request_data.email],
            body=html,
            subtype=MessageType.html,
        )

        fm = FastMail(get_mail_config())
        background_tasks.add_task(fm.send_message, message)

    return response_msg


@router.post("/reset-password-confirm")
async def reset_password_confirm(data: ResetPasswordConfirmRequest):
    ok = await update_password_with_reset_token(data.token, data.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    return {"message": "Password updated successfully"}
