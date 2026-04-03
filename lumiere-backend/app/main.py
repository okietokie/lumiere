import logging
import os
import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from app.core.config import (
    APP_DESCRIPTION,
    APP_NAME,
    APP_VERSION,
    B2_PUBLIC_URL,
    PROJECT_ASSETS_DIR,
    VIDEOS_DIR,
    get_allowed_origins,
)
from app.core.database import ensure_indexes, ping_database
from app.routes import auth_routes, model_routes, project_routes
from app.services.sync_b2_to_mongo import sync_b2_to_mongo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0),
            limits=httpx.Limits(max_connections=40, max_keepalive_connections=20),
            follow_redirects=True,
        )
    return _http_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Lumiere backend is starting up...")
    success = await ping_database()
    if success:
        logger.info("MongoDB connected")
        await ensure_indexes()
    else:
        logger.error("MongoDB connection failed")

    try:
        await sync_b2_to_mongo()
    except Exception:
        logger.exception("Startup sync failed; continuing without B2/Mongo warm sync.")

    yield

    global _http_client
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()
    logger.info("Lumiere backend is shutting down...")


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*", "Content-Length", "Cache-Control", "ETag"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(time.time() - start_time)
    return response


app.include_router(auth_routes.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(model_routes.router, prefix="/api/models", tags=["Models"])
app.include_router(project_routes.router, prefix="/api/projects", tags=["Projects"])

os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(PROJECT_ASSETS_DIR, exist_ok=True)
app.mount("/api/videos", StaticFiles(directory=VIDEOS_DIR), name="videos")
app.mount("/api/project-assets", StaticFiles(directory=PROJECT_ASSETS_DIR), name="project-assets")


@app.get("/api/proxy/models/{file_path:path}")
async def proxy_model(file_path: str, request: Request):
    b2_url = f"{B2_PUBLIC_URL.rstrip('/')}/{file_path}"
    logger.info("Proxy request: %s", file_path)

    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "86400",
            },
        )

    client_etag = request.headers.get("if-none-match", "")
    http = get_http_client()

    try:
        resp = await http.get(b2_url)
    except httpx.RequestError as exc:
        logger.error("Proxy fetch error: %s", exc)
        raise HTTPException(status_code=502, detail="Could not reach model storage")

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Model not found: {file_path}")
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Storage error")

    import hashlib

    data = resp.content
    etag = f'"{hashlib.md5(data).hexdigest()}"'

    if client_etag and client_etag == etag:
        return Response(
            status_code=304,
            headers={
                "Access-Control-Allow-Origin": "*",
                "ETag": etag,
                "Cache-Control": "public, max-age=2592000, immutable",
            },
        )

    return Response(
        content=data,
        media_type="model/gltf-binary",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=2592000, immutable",
            "ETag": etag,
            "Content-Length": str(len(data)),
        },
    )


@app.get("/")
def root():
    return {"status": "Lumiere backend running", "docs": "/docs"}


@app.get("/api/ready")
def ready():
    return {"ready": True}
