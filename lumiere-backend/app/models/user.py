from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from bson import ObjectId

# This is what the API receives during Sign Up (Plain text password allowed here)
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6)

# This is what the API sends back to the frontend (Security: No password included)
class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: Optional[datetime] = None
    
    # Pydantic v2 config to handle MongoDB's ObjectId properly
    model_config = ConfigDict(
        json_encoders={ObjectId: str},
        from_attributes=True,
        populate_by_name=True
    )

# This represents how the user is stored in the Database (Hashed password ONLY)
class UserInDB(BaseModel):
    name: str
    email: EmailStr
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        from_attributes=True
    )