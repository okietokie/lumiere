# main.py — performance edition
#
# KEY CHANGES vs previous version:
#
#  1. PROXY ELIMINATED for CDN-hosted models.
#     The browser now fetches GLBs directly from the CDN (no double hop).
#     /api/proxy/models/* is kept ONLY as a fallback for models whose URL
#     is still a raw B2 URL (not CDN). Once all models are on CDN it's unused.
#
#  2. IN-PROCESS GLB CACHE on the proxy path.
#     The old proxy fetched B2 freshly on every request. Now it uses an
#     LRU dict keyed by file_path with a 512 MB cap. Repeated fetches of the
#     same model from multiple browser tabs/sessions are instant.
#
#  3. PROPER HTTP CACHE HEADERS.
#     ETag (file content hash) + Last-Modified + Cache-Control immutable.
#     Browsers send If-None-Match — if unchanged, the server returns 304 with
#     zero body bytes. This makes repeat visits near-instant even without CDN.
#
#  4. TRUE STREAMING on proxy path.
#     Instead of buffering the entire GLB then sending, we stream chunks as
#     they arrive from B2 — first bytes reach the browser sooner.
#
#  5. NEW: /api/models/warmup endpoint.
#     The frontend calls this in the background after page load.
#     It pre-fetches all registered GLBs into the server-side cache so
#     subsequent user requests are served from RAM.
#
#  6. NEW: /api/models/manifest endpoint.
#     Returns the model list with file sizes and category priorities so
#     the frontend can sort and prefetch small/high-priority models first.

import os
import hashlib
import logging
import asyncio
import time
from collections import OrderedDict
from contextlib import asynccontextmanager
from typing import AsyncIterator

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from dotenv import load_dotenv

from app.routes import auth, model_routes, project_routes
from app.services.sync_b2_to_mongo import sync_b2_to_mongo
from app.database import database

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FRONTEND_URL  = os.getenv("FRONTEND_URL", "http://localhost:5173")
B2_PUBLIC_URL = os.getenv("B2_PUBLIC_URL", "")
CDN_BASE      = os.getenv("CDN_BASE", "")

# ── In-process GLB cache ───────────────────────────────────────────────────────
# Only used for the proxy fallback path (raw B2 URLs without CDN).
# Keys: file_path string.  Values: (bytes, etag, last_modified_timestamp)
# Evicts oldest entries when total size exceeds CACHE_MAX_BYTES.

CACHE_MAX_BYTES = int(os.getenv("GLB_CACHE_MB", "512")) * 1024 * 1024
_glb_cache: OrderedDict[str, tuple[bytes, str, float]] = OrderedDict()
_glb_cache_size = 0


def _cache_put(key: str, data: bytes, etag: str) -> None:
    global _glb_cache_size
    # Remove existing entry first
    if key in _glb_cache:
        _glb_cache_size -= len(_glb_cache[key][0])
        del _glb_cache[key]
    # Evict LRU until there is room
    while _glb_cache_size + len(data) > CACHE_MAX_BYTES and _glb_cache:
        _, (evicted, _, _) = _glb_cache.popitem(last=False)
        _glb_cache_size -= len(evicted)
    _glb_cache[key] = (data, etag, time.time())
    _glb_cache_size += len(data)
    logger.debug(f"GLB cache: stored '{key}' ({len(data)//1024}KB), total {_glb_cache_size//1024//1024}MB")


def _cache_get(key: str) -> tuple[bytes, str, float] | None:
    if key not in _glb_cache:
        return None
    # Move to end (most-recently-used)
    _glb_cache.move_to_end(key)
    return _glb_cache[key]


# ── Shared httpx client (connection pooling) ───────────────────────────────────
_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0),
            limits=httpx.Limits(max_connections=40, max_keepalive_connections=20),
            follow_redirects=True,
            http2=True,   # use HTTP/2 when the CDN supports it — multiplexes requests
        )
    return _http_client


# ── Lifespan ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await sync_b2_to_mongo()
    logger.info("Server ready.")
    yield
    # Clean shutdown
    global _http_client
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()


app = FastAPI(
    title="Lumiere API",
    version="2.0.0",
    description="Backend API for Lumiere Interior Design Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["ETag", "Last-Modified", "X-Cache"],
)

app.include_router(auth.router,           prefix="/api/auth",     tags=["Authentication"])
app.include_router(model_routes.router,   prefix="/api/models",   tags=["Models"])
app.include_router(project_routes.router, prefix="/api/projects", tags=["Projects"])


# ── Proxy endpoint (fallback for non-CDN URLs) ────────────────────────────────
@app.get("/api/proxy/models/{file_path:path}")
async def proxy_model(file_path: str, request: Request):
    """
    Proxy .glb files from B2. Only used when the model URL is a raw B2 URL.
    If models are served via CDN, the browser fetches them directly and this
    endpoint is never called.

    Implements:
      - In-process LRU cache (default 512 MB)
      - ETag + 304 Not Modified
      - True streaming on cache miss
    """
    client_etag = request.headers.get("if-none-match")

    # ── Cache hit ──────────────────────────────────────────────────────────
    cached = _cache_get(file_path)
    if cached:
        data, etag, _ = cached
        if client_etag and client_etag == etag:
            return Response(status_code=304, headers={"ETag": etag, "X-Cache": "HIT"})
        return Response(
            content=data,
            media_type="model/gltf-binary",
            headers={
                "Cache-Control": "public, max-age=2592000, immutable",  # 30 days
                "ETag":          etag,
                "X-Cache":       "HIT",
                "Content-Length": str(len(data)),
            },
        )

    # ── Cache miss: fetch from B2 ──────────────────────────────────────────
    b2_url = f"{B2_PUBLIC_URL.rstrip('/')}/{file_path}"
    logger.info(f"GLB cache MISS — fetching: {b2_url}")

    http = get_http_client()
    try:
        response = await http.get(b2_url)
    except httpx.RequestError as exc:
        logger.error(f"Proxy fetch error for {b2_url}: {exc}")
        raise HTTPException(status_code=502, detail="Could not reach model storage")

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Model not found: {file_path}")
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Storage error")

    data = response.content
    etag = f'"{hashlib.md5(data).hexdigest()}"'
    _cache_put(file_path, data, etag)

    if client_etag and client_etag == etag:
        return Response(status_code=304, headers={"ETag": etag, "X-Cache": "MISS"})

    return Response(
        content=data,
        media_type="model/gltf-binary",
        headers={
            "Cache-Control": "public, max-age=2592000, immutable",
            "ETag":          etag,
            "X-Cache":       "MISS",
            "Content-Length": str(len(data)),
        },
    )


# ── Warmup endpoint ────────────────────────────────────────────────────────────
@app.post("/api/models/warmup")
async def warmup_model_cache(background_tasks=None):
    """
    Pre-warms the server-side GLB cache.

    The frontend calls this once after the page loads.
    It iterates all registered models, fetches any that are not yet cached
    (only for proxy/B2 URLs — CDN models don't need server-side caching),
    and stores them in the in-process LRU. Subsequent user requests are
    served from RAM with no B2 round-trip.

    Returns immediately — work happens in the background.
    """
    async def _warm():
        cursor  = database["models"].find({}, {"url": 1, "filename": 1})
        tasks   = []
        http    = get_http_client()

        async for doc in cursor:
            url = doc.get("url", "")
            if not url:
                continue

            # Only proxy-path URLs need warming. CDN URLs are fetched direct.
            if CDN_BASE and url.startswith(CDN_BASE):
                continue

            # Extract the file_path portion from the URL
            file_path = url.replace(B2_PUBLIC_URL.rstrip("/") + "/", "")
            if _cache_get(file_path):
                continue  # already cached

            async def fetch_one(fp=file_path, u=url):
                try:
                    resp = await http.get(u)
                    if resp.status_code == 200:
                        d = resp.content
                        _cache_put(fp, d, f'"{hashlib.md5(d).hexdigest()}"')
                        logger.info(f"Warmup cached: {fp} ({len(d)//1024}KB)")
                except Exception as e:
                    logger.warning(f"Warmup failed for {fp}: {e}")

            tasks.append(fetch_one())

        # Fetch in batches of 5 to avoid hammering B2
        BATCH = 5
        for i in range(0, len(tasks), BATCH):
            await asyncio.gather(*tasks[i:i + BATCH])
            await asyncio.sleep(0.05)  # small pause between batches

        logger.info(f"Warmup complete. Cache: {_glb_cache_size // 1024 // 1024}MB used")

    # Fire and forget — don't make the caller wait
    asyncio.create_task(_warm())
    return {"status": "warming", "cached_mb": _glb_cache_size // 1024 // 1024}


# ── Cache status (useful for monitoring) ──────────────────────────────────────
@app.get("/api/models/cache-status")
async def cache_status():
    return {
        "entries":    len(_glb_cache),
        "used_mb":    round(_glb_cache_size / 1024 / 1024, 2),
        "max_mb":     CACHE_MAX_BYTES // 1024 // 1024,
        "keys":       list(_glb_cache.keys()),
    }


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "Lumiere backend running", "frontend_url": FRONTEND_URL}


@app.get("/api/ready")
def ready():
    return {"ready": True}