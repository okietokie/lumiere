import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(r"C:\Users\kalya\Lumiere\.env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

async def clear():
    client = AsyncIOMotorClient(MONGO_URI)
    db     = client.lumiere
    result = await db.models.delete_many({})
    print(f"Deleted {result.deleted_count} model documents from MongoDB.")
    client.close()

asyncio.run(clear())