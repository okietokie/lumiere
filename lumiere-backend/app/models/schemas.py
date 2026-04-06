from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime


# ── Shared ─────────────────────────────────────────────
class PyObjectId(str):
    """Simple string alias for MongoDB ObjectId fields."""
    pass


# ── User ───────────────────────────────────────────────
class UserBase(BaseModel):
    name:  str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name:   Optional[str]  = None
    avatar: Optional[str]  = None

class UserOut(UserBase):
    id:           str
    avatar:       Optional[str]  = None
    storage_used: int            = 0
    created_at:   datetime

    class Config:
        from_attributes = True


# ── Project ────────────────────────────────────────────
class ProjectCreate(BaseModel):
    name:        str
    description: Optional[str] = None
    thumbnail:   Optional[str] = None

class ProjectUpdate(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None
    thumbnail:   Optional[str] = None

class ProjectOut(BaseModel):
    id:            str
    user_id:       str
    name:          str
    description:   Optional[str]  = None
    thumbnail:     Optional[str]  = None
    rooms_count:   int            = 0
    created_at:    datetime
    last_modified: datetime

    class Config:
        from_attributes = True


# ── Room ───────────────────────────────────────────────
class RoomCreate(BaseModel):
    project_id: str
    name:       str
    width:      float = 5.0
    height:     float = 4.0
    objects:    List[Any] = Field(default_factory=list)

class RoomUpdate(BaseModel):
    name:    Optional[str]   = None
    width:   Optional[float] = None
    height:  Optional[float] = None
    objects: Optional[List[Any]] = None

class RoomOut(BaseModel):
    id:         str
    project_id: str
    name:       str
    width:      float
    height:     float
    objects:    List[Any]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Activity ───────────────────────────────────────────
class ActivityLog(BaseModel):
    user_id:      str
    project_id:   Optional[str]  = None
    type:         str             # created | edited | deleted | uploaded | added
    action:       str
    target:       Optional[str]  = None
    project_name: Optional[str]  = None
    timestamp:    datetime

class ActivityOut(ActivityLog):
    id: str

    class Config:
        from_attributes = True


# ── Storage ────────────────────────────────────────────
class StorageOut(BaseModel):
    used_mb:  float
    total_mb: float
    projects: dict   # { used: int, max: int }
    rooms:    dict   # { used: int, max: int }


# ── Auth ───────────────────────────────────────────────
class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
