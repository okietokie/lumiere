# main.py
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes import auth, model_routes
from app.services.model_service import sync_from_mega

load_dotenv()
logging.basicConfig(level=logging.INFO)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await sync_from_mega()          # downloads new .glb files from Mega once
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

app.include_router(auth.router,         prefix="/api/auth",   tags=["Authentication"])
app.include_router(model_routes.router, prefix="/api/models", tags=["Models"])


@app.get("/")
def root():
    return {"status": "Lumiere backend running", "frontend_url": FRONTEND_URL}