import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from app.routes import auth

# Get frontend URL from environment
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

API_TITLE = "Lumiere API"
API_VERSION = "1.0.0"
API_DESCRIPTION = "Backend API for Lumiere Interior Design Platform"

# FastAPI app initialization
app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
)

origins = [
    FRONTEND_URL,
]

# Add common variations for development
if FRONTEND_URL == "http://localhost:5173":
    origins.extend([
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Authentication"]
)

@app.get("/")
def root():
    return {"status": "Lumiere backend running", "frontend_url": FRONTEND_URL}

@app.get("/test")
async def test_endpoint():
    return {"message": "Backend is working"}
