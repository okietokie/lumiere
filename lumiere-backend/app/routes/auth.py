from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from bson import ObjectId

from app.database import user_collection
from app.models.schemas import UserCreate, LoginRequest, TokenResponse, UserOut
from app.utils.auth import hash_password, verify_password, create_token, get_current_user_id

router = APIRouter()


def _user_out(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate):
    existing = await user_collection.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    doc = {
        "name":         payload.name,
        "email":        payload.email,
        "password":     hash_password(payload.password),
        "avatar":       None,
        "storage_used": 0,
        "created_at":   datetime.utcnow(),
    }
    result = await user_collection.insert_one(doc)
    token  = create_token(str(result.inserted_id))
    return {"access_token": token, "token_type": "bearer", "message": "Registration successful."}


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    user = await user_collection.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {"access_token": create_token(str(user["_id"])), "token_type": "bearer"}


@router.post("/logout")
async def logout():
    # JWT is stateless; client drops the token.
    return {"message": "Logged out successfully."}


@router.get("/me")
async def me(user_id: str = Depends(get_current_user_id)):
    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"data": _user_out(user)}
