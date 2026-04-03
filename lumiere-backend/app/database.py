import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pymongo.errors import PyMongoError
from pymongo import ssl_support

# Load environment variables from .env file
load_dotenv()

# Get the MongoDB URI from environment or default to localhost
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Force PyMongo to use Python's stdlib SSL implementation.
# In this environment, PyOpenSSL imports successfully but fails later while
# resolving default cert paths for mongodb+srv TLS connections.
if getattr(ssl_support, "HAVE_PYSSL", False):
    ssl_support.HAVE_PYSSL = False

# Connect to MongoDB (Motor is lazy - actual connection happens on first use)
try:
    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)

    database = client["lumiere"]

    # Collections
    user_collection = database["users"]
    design_collection = database["designs"]
except Exception as e:
    print(f"❌ Could not initialize MongoDB client: {e}")


async def ping_database():
    try:
        await client.admin.command("ping")
        return True
    except PyMongoError:
        return False
