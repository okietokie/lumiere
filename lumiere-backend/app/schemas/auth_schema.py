from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordConfirmRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AuthResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
