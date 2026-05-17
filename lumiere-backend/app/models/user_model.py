# models/user_model.py
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.utils.helpers import utcnow


class UserDocument(BaseModel):
    name: str
    email: EmailStr
    password_hash: str
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
