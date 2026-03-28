import os
import logging
import httpx
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, StreamingResponse
from dotenv import load_dotenv

from app.routes import auth, model_routes, project_routes
from app.services.sync_b2_to_mongo import sync_b2_to_mongo

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
B2_PUBLIC_URL = os.getenv("B2_PUBLIC_URL", "")
CDN_BASE = os.getenv("CDN_BASE", "")
VIDEOS_DIR = os.getenv("VIDEOS_DIR", "/tmp/lumiere_videos")
PROJECT_ASSETS_DIR = os.getenv("PROJECT_ASSETS_DIR", "/tmp/lumiere_project_assets")

# Reuses a single HTTP client for proxy requests.
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
    await sync_b2_to_mongo()
    logger.info("Server ready.")
    yield
    global _http_client
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()


app = FastAPI(
    title="Lumiere API",
    version="1.0.0",
    description="Backend API for Lumiere Interior Design Platform",
    lifespan=lifespan,
)

# Allows model fetches from any origin without credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Cache-Control", "ETag"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(model_routes.router, prefix="/api/models", tags=["Models"])
app.include_router(project_routes.router, prefix="/api/projects", tags=["Projects"])
os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(PROJECT_ASSETS_DIR, exist_ok=True)
app.mount("/api/videos", StaticFiles(directory=VIDEOS_DIR), name="videos")
app.mount("/api/project-assets", StaticFiles(directory=PROJECT_ASSETS_DIR), name="project-assets")


# Proxies direct B2 model requests when the CDN URL is unavailable.
@app.get("/api/proxy/models/{file_path:path}")
async def proxy_model(file_path: str, request: Request):
    b2_url = f"{B2_PUBLIC_URL.rstrip('/')}/{file_path}"
    logger.info(f"Proxy request: {file_path}")

    # Handles explicit preflight requests.
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
        logger.error(f"Proxy fetch error: {exc}")
        raise HTTPException(status_code=502, detail="Could not reach model storage")

    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Model not found: {file_path}")
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Storage error")

    data = resp.content
    import hashlib
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
            # Mirrors CORS headers on the proxied response.
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=2592000, immutable",
            "ETag": etag,
            "Content-Length": str(len(data)),
        },
    )


@app.get("/")
def root():
    return {"status": "Lumiere backend running", "frontend_url": FRONTEND_URL}


@app.get("/api/ready")
def ready():
    return {"ready": True}
