import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Connect to MongoDB
client = AsyncIOMotorClient(MONGO_URI)
database = client.lumiere

# Collections
user_collection = database.users
design_collection = database.designs

print(f"Connected to MongoDB: {MONGO_URI}")