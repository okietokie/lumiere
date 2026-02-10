from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from bson import ObjectId

# Pydantic v2 doesn't need custom ObjectId class for basic usage
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    
    # Pydantic v2 config
    model_config = ConfigDict(
        json_encoders={ObjectId: str},
        from_attributes=True
    )