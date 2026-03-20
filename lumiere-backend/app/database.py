import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

# Connect to MongoDB
client = AsyncIOMotorClient(MONGO_URI)
database = client.lumiere

# Collections
user_collection = database.users
design_collection = database.designs

