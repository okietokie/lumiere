import os
from pathlib import PurePosixPath


B2_KEY_ID = os.getenv("B2_KEY_ID")
B2_APP_KEY = os.getenv("B2_APP_KEY")
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME")
CDN_BASE = os.getenv("CDN_BASE", "")


def _get_bucket():
    if not B2_KEY_ID or not B2_APP_KEY or not B2_BUCKET_NAME:
        raise RuntimeError("B2 credentials are not configured")

    from b2sdk.v2 import InMemoryAccountInfo, B2Api

    info = InMemoryAccountInfo()
    api = B2Api(info)
    api.authorize_account("production", B2_KEY_ID, B2_APP_KEY)
    return api.get_bucket_by_name(B2_BUCKET_NAME)


def build_preview_path(model_filename: str, extension: str) -> str:
    clean_ext = extension.lower().lstrip(".") or "webp"
    source = PurePosixPath(model_filename)
    relative = source.with_suffix(f".{clean_ext}")
    return str(PurePosixPath("previews") / relative)


def build_preview_url(preview_path: str) -> str:
    return f"{CDN_BASE.rstrip('/')}/{preview_path.lstrip('/')}"


def upload_preview_bytes(model_filename: str, data: bytes, content_type: str, extension: str) -> tuple[str, str]:
    bucket = _get_bucket()
    preview_path = build_preview_path(model_filename, extension)
    bucket.upload_bytes(
        data_bytes=data,
        file_name=preview_path,
        content_type=content_type,
    )
    return preview_path, build_preview_url(preview_path)
