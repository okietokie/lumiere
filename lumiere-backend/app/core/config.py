import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(ROOT_ENV_FILE)

ENVIRONMENT = (os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "development").strip().lower()
IS_PRODUCTION = ENVIRONMENT in {"production", "prod"}
IS_DEVELOPMENT = ENVIRONMENT in {"development", "dev", "local"}
DEFAULT_JWT_SECRET = "lumiere-dev-secret"

APP_NAME = "Lumiere API"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = "Backend API for Lumiere Interior Design Platform"

MONGO_URI = os.getenv("MONGO_URI")
LOCAL_MONGO_URI = os.getenv("LOCAL_MONGO_URI", "mongodb://127.0.0.1:27017")
MONGO_FALLBACK_ENABLED = os.getenv("MONGO_FALLBACK_ENABLED", "true").lower() in {"1", "true", "yes", "on"}
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "lumiere")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY") or DEFAULT_JWT_SECRET
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

FRONTEND_URL = os.getenv("FRONTEND_URL") or "https://www.lumiere-maison.site"
B2_PUBLIC_URL = os.getenv("B2_PUBLIC_URL", "")
VIDEOS_DIR = os.getenv("VIDEOS_DIR", "/tmp/lumiere_videos")
VIDEO_SERVE_URL = os.getenv("VIDEO_SERVE_URL", "")
PROJECT_ASSETS_DIR = os.getenv("PROJECT_ASSETS_DIR", "/tmp/lumiere_project_assets")
PROJECT_ASSET_SERVE_URL = os.getenv("PROJECT_ASSET_SERVE_URL", "")


def get_allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    origins = [
        FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://lumiere-maison.site",
        "https://www.lumiere-maison.site",
    ]
    return list(dict.fromkeys(origin for origin in origins if origin))


def validate_security_settings() -> None:
    if IS_PRODUCTION and JWT_SECRET_KEY == DEFAULT_JWT_SECRET:
        raise RuntimeError(
            "JWT secret is using the default development value. Set JWT_SECRET_KEY for production."
        )

    if IS_PRODUCTION and len(JWT_SECRET_KEY) < 32:
        raise RuntimeError(
            "JWT secret must be at least 32 characters long in production."
        )
