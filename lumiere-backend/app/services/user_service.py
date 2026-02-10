from app.database import user_collection
from bson import ObjectId
import bcrypt
from datetime import datetime

async def create_user(user: dict):
    # Hash the password before storing
    hashed_password = bcrypt.hashpw(
        user["password"].encode('utf-8'), 
        bcrypt.gensalt()
    )
    
    user_data = {
        "name": user["name"],
        "email": user["email"],
        "password": hashed_password.decode('utf-8'),
        "created_at": datetime.utcnow()
    }
    
    # Insert user
    result = await user_collection.insert_one(user_data)
    
    # Return user data
    return {
        "id": str(result.inserted_id),
        "name": user["name"],
        "email": user["email"],
        "created_at": user_data["created_at"]
    }

async def get_user_by_email(email: str):
    return await user_collection.find_one({"email": email})