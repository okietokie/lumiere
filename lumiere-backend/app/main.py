import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import (
    APP_DESCRIPTION,
    APP_NAME,
    APP_VERSION,
    B2_PUBLIC_URL,
    PROJECT_ASSETS_DIR,
    VIDEOS_DIR,
    get_allowed_origins,
    validate_security_settings,
)
from app.core.database import close_database, connect_database, ensure_indexes, get_active_database_label
from app.routes import auth_routes, model_routes, project_routes
from app.services.sync_b2_to_mongo import sync_b2_to_mongo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProcessTimeHeaderMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.perf_counter()

        async def send_with_process_time(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                process_time = f"{time.perf_counter() - start_time:.6f}".encode("ascii")
                headers.append((b"x-process-time", process_time))
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_with_process_time)
        except asyncio.CancelledError:
            logger.debug("Request cancelled during shutdown: %s", scope.get("path"))
            return

@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_security_settings()
    logger.info("Lumiere backend is starting up...")
    success = await connect_database()
    if success:
        logger.info("MongoDB ready via %s configuration", get_active_database_label())
        await ensure_indexes()
    else:
        logger.error("MongoDB connection failed for both primary and local fallback")

    try:
        await sync_b2_to_mongo()
    except Exception:
        logger.exception("Startup sync failed; continuing without B2/Mongo warm sync.")

    yield

    close_database()
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
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*", "Content-Length", "Cache-Control", "ETag"],
)
app.add_middleware(ProcessTimeHeaderMiddleware)


app.include_router(auth_routes.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(model_routes.router, prefix="/api/models", tags=["Models"])
app.include_router(project_routes.router, prefix="/api/projects", tags=["Projects"])
app.include_router(project_routes.router, prefix="/projects", tags=["Projects Legacy"])

os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(PROJECT_ASSETS_DIR, exist_ok=True)
app.mount("/api/videos", StaticFiles(directory=VIDEOS_DIR), name="videos")
app.mount("/api/project-assets", StaticFiles(directory=PROJECT_ASSETS_DIR), name="project-assets")


@app.get("/api/proxy/models/{file_path:path}")
async def proxy_model(file_path: str, request: Request):
    if not B2_PUBLIC_URL:
        raise HTTPException(status_code=503, detail="Model storage is not configured")

    b2_url = f"{B2_PUBLIC_URL.rstrip('/')}/{file_path}"

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

    return RedirectResponse(
        url=b2_url,
        status_code=307,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=2592000, immutable",
        },
    )


@app.get("/")
def root():
    return {"status": "Lumiere backend running", "docs": "/docs"}


@app.get("/api/ready")
def ready():
    return {"ready": True}
