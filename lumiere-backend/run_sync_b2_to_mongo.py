import asyncio
import logging

from app.core.database import close_database, connect_database, ensure_indexes, get_active_database_label
from app.services.sync_b2_to_mongo import sync_b2_to_mongo


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main() -> int:
    logger.info("Connecting to MongoDB...")
    success = await connect_database()
    if not success:
        logger.error("MongoDB connection failed; sync aborted.")
        return 1

    logger.info("MongoDB ready via %s configuration", get_active_database_label())
    await ensure_indexes()
    await sync_b2_to_mongo()
    close_database()
    logger.info("B2 to Mongo sync finished.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
