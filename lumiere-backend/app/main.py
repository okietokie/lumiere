import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# ── Import routers ─────────────────────────────────────
from app.routes import auth, projects, rooms, activity, storage

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app = FastAPI(
    title="Lumière Maison API",
    version="1.0.0",
    description="Backend API for the Lumière Maison interior design platform.",
)

# ── CORS ───────────────────────────────────────────────
origins = [FRONTEND_URL]
if "localhost" in FRONTEND_URL:
    origins += [
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────
app.include_router(auth.router,             prefix="/api/auth",     tags=["Auth"])
app.include_router(projects.router,         prefix="/api/projects", tags=["Projects"])
app.include_router(rooms.router,            prefix="/api/rooms",    tags=["Rooms"])
app.include_router(activity.router, prefix="/api/activity", tags=["Activity"])
app.include_router(storage.router,  prefix="/api/storage",  tags=["Storage"])


# ── Health ─────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "✦ Lumière Maison API running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}