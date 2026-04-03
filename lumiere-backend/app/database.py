import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the MongoDB URI from environment or default to localhost
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Connect to MongoDB (Motor is lazy - actual connection happens on first use)
try:
    client = AsyncIOMotorClient(MONGO_URI)

    database = client["lumiere"]

    # Collections
    user_collection = database["users"]
    design_collection = database["designs"]

    print(f"✅ MongoDB client initialized for: {MONGO_URI}")
except Exception as e:
    print(f"❌ Could not initialize MongoDB client: {e}")