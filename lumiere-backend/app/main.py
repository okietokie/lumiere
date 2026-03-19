# main.py
import os
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes import auth, model_routes, project_routes
from app.services.model_service import sync_from_mega, sync_from_local

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


async def _background_sync():
    """Runs Mega sync in background so the server starts immediately."""
    try:
        await sync_from_mega()
    except Exception as e:
        logger.error(f"Background Mega sync failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────────────────
    # 1. Scan local disk instantly — registers any already-downloaded models
    #    so /api/models/list is populated the moment the server starts.
    await sync_from_local()
    # 2. Run Mega sync in background — downloads new files without blocking.
    #    Models appear in /list as they finish (frontend polls every 5s).
    asyncio.create_task(_background_sync())
    logger.info("Server ready. Mega sync running in background...")
    yield
    # ── Shutdown ──────────────────────────────────────────────────────────────


app = FastAPI(
    title="Lumiere API",
    version="1.0.0",
    description="Backend API for Lumiere Interior Design Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/api/auth",   tags=["Authentication"])
app.include_router(model_routes.router,  prefix="/api/models",   tags=["Models"])
app.include_router(project_routes.router, prefix="/api/projects", tags=["Projects"])


@app.get("/")
def root():
    return {"status": "Lumiere backend running", "frontend_url": FRONTEND_URL}


@app.get("/api/ready")
def ready():
    """Frontend can poll this to know the server is up before making other calls."""
    return {"ready": True}