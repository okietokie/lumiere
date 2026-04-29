import certifi
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import PyMongoError
from motor.motor_asyncio import AsyncIOMotorClient
import logging

from app.core.config import MONGO_DB_NAME, MONGO_URI

logger = logging.getLogger(__name__)

if not MONGO_URI:
    raise RuntimeError("MONGO_URI is not set. Check the backend environment configuration.")

client = AsyncIOMotorClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000,
    tls=True,
    tlsCAFile=certifi.where(),
)
database = client[MONGO_DB_NAME]

users_collection = database["users"]
projects_collection = database["projects"]
design_collection = database["designs"]


async def ping_database() -> bool:
    try:
        await client.admin.command("ping")
        return True
    except PyMongoError as exc:
        logger.error("MongoDB ping failed: %s", exc)
        return False


async def ensure_indexes() -> None:
    await users_collection.create_index([("email", ASCENDING)], unique=True)
    await projects_collection.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
    await projects_collection.create_index([("user_id", ASCENDING), ("last_opened_at", DESCENDING)])
