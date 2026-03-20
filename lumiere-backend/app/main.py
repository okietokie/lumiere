# main.py — B2 edition
import os
import logging
import httpx
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from app.routes import auth, model_routes, project_routes
from app.services.sync_b2_to_mongo import sync_b2_to_mongo

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
B2_PUBLIC_URL = os.getenv("B2_PUBLIC_URL")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On every startup: check B2 bucket and register any missing models in MongoDB.
    # Fast — just a bucket list + upserts, no file downloads.
    await sync_b2_to_mongo()
    logger.info("Server ready.")
    yield


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

app.include_router(auth.router,           prefix="/api/auth",     tags=["Authentication"])
app.include_router(model_routes.router,   prefix="/api/models",   tags=["Models"])
app.include_router(project_routes.router, prefix="/api/projects", tags=["Projects"])


@app.get("/api/proxy/models/{file_path:path}")
async def proxy_model(file_path: str):
    """
    Proxy .glb model files from Backblaze B2 to avoid CORS issues.
    Usage: fetch('/api/proxy/models/cupboard/cupboard-2.glb') instead of
           fetching the B2 URL directly.
    """
    b2_url = f"{B2_PUBLIC_URL}/{file_path}"
    logger.info(f"Proxying model: {b2_url}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(b2_url, follow_redirects=True, timeout=30.0)
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Model not found: {file_path}")
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch model from storage")
        except httpx.RequestError as e:
            logger.error(f"Error fetching {b2_url}: {e}")
            raise HTTPException(status_code=502, detail="Could not reach model storage")

    return StreamingResponse(
        content=iter([response.content]),
        media_type="model/gltf-binary",
        headers={
            "Cache-Control": "public, max-age=86400",  # cache for 1 day
            "Content-Length": str(len(response.content)),
        },
    )


@app.get("/")
def root():
    return {"status": "Lumiere backend running", "frontend_url": FRONTEND_URL}


@app.get("/api/ready")
def ready():
    return {"ready": True}