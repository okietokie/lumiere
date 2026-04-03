from pymongo import ASCENDING, DESCENDING, ssl_support
from pymongo.errors import PyMongoError
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import MONGO_DB_NAME, MONGO_URI

if getattr(ssl_support, "HAVE_PYSSL", False):
    ssl_support.HAVE_PYSSL = False

client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
database = client[MONGO_DB_NAME]

users_collection = database["users"]
projects_collection = database["projects"]
design_collection = database["designs"]


async def ping_database() -> bool:
    try:
        await client.admin.command("ping")
        return True
    except PyMongoError:
        return False


async def ensure_indexes() -> None:
    await users_collection.create_index([("email", ASCENDING)], unique=True)
    await projects_collection.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
    await projects_collection.create_index([("user_id", ASCENDING), ("last_opened_at", DESCENDING)])
