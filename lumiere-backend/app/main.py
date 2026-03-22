# main.py
import os
import logging
import httpx
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from dotenv import load_dotenv

from app.routes import auth, model_routes, project_routes
from app.services.sync_b2_to_mongo import sync_b2_to_mongo

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FRONTEND_URL  = os.getenv("FRONTEND_URL",  "http://localhost:5173")
B2_PUBLIC_URL = os.getenv("B2_PUBLIC_URL", "")
CDN_BASE      = os.getenv("CDN_BASE",      "")

# ── Shared httpx client (connection pooling, keeps connections alive) ──────────
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

# ── CORS ───────────────────────────────────────────────────────────────────────
# IMPORTANT: allow_origins=["*"] and allow_credentials=True CANNOT be combined.
# The CORS spec forbids it — browsers reject responses with both.
# Since GLB fetches don't need cookies/credentials, we use wildcard + no credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # all origins allowed
    allow_credentials=False,   # MUST be False when allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Cache-Control", "ETag"],
)

app.include_router(auth.router,           prefix="/api/auth",     tags=["Authentication"])
app.include_router(model_routes.router,   prefix="/api/models",   tags=["Models"])
app.include_router(project_routes.router, prefix="/api/projects", tags=["Projects"])


# ── Proxy endpoint ─────────────────────────────────────────────────────────────
# Fallback only — used when a model URL is a raw B2 URL (not CDN).
# If VITE_CDN_BASE is set in the frontend build, this endpoint is never called
# because the browser fetches GLBs directly from the CDN.
@app.get("/api/proxy/models/{file_path:path}")
async def proxy_model(file_path: str, request: Request):
    b2_url = f"{B2_PUBLIC_URL.rstrip('/')}/{file_path}"
    logger.info(f"Proxy request: {file_path}")

    # Handle browser preflight (OPTIONS) — middleware handles it but be explicit
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin":  "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age":       "86400",
            },
        )

    # Check ETag for 304 Not Modified
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

    data  = resp.content
    import hashlib
    etag  = f'"{hashlib.md5(data).hexdigest()}"'

    # Return 304 if client already has this version
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
            # These CORS headers are set explicitly on the response as a
            # safety net — the middleware should add them, but explicit is safer.
            "Access-Control-Allow-Origin":  "*",
            "Cache-Control": "public, max-age=2592000, immutable",  # 30 days
            "ETag":          etag,
            "Content-Length": str(len(data)),
        },
    )


@app.get("/")
def root():
    return {"status": "Lumiere backend running", "frontend_url": FRONTEND_URL}

@app.get("/api/ready")
def ready():
    return {"ready": True}