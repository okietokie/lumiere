import os
from pathlib import PurePosixPath


B2_KEY_ID = os.getenv("B2_KEY_ID")
B2_APP_KEY = os.getenv("B2_APP_KEY")
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME")
CDN_BASE = os.getenv("CDN_BASE", "")
B2_PUBLIC_URL = os.getenv("B2_PUBLIC_URL", "")
_bucket = None


def _get_bucket():
    global _bucket
    if _bucket is not None:
        return _bucket

    if not B2_KEY_ID or not B2_APP_KEY or not B2_BUCKET_NAME:
        raise RuntimeError("B2 credentials are not configured")

    from b2sdk.v2 import InMemoryAccountInfo, B2Api

    info = InMemoryAccountInfo()
    api = B2Api(info)
    api.authorize_account("production", B2_KEY_ID, B2_APP_KEY)
    _bucket = api.get_bucket_by_name(B2_BUCKET_NAME)
    return _bucket


def has_b2_storage() -> bool:
    return bool(B2_KEY_ID and B2_APP_KEY and B2_BUCKET_NAME)


def _public_base_url() -> str:
    return (CDN_BASE or B2_PUBLIC_URL).rstrip("/")


def has_public_asset_base() -> bool:
    return bool(_public_base_url())


def build_preview_path(model_filename: str, extension: str) -> str:
    clean_ext = extension.lower().lstrip(".") or "webp"
    source = PurePosixPath(model_filename)
    stemmed = source.with_suffix(f".{clean_ext}")
    parent = stemmed.parent
    if str(parent) and str(parent) != ".":
        return str(parent / "previews" / stemmed.name)
    return str(PurePosixPath("previews") / stemmed.name)


def build_preview_url(preview_path: str) -> str:
    return f"{_public_base_url()}/{preview_path.lstrip('/')}"


def build_public_asset_url(path: str) -> str:
    base = _public_base_url()
    if not base:
        raise RuntimeError("Public asset base URL is not configured")
    return f"{base}/{path.lstrip('/')}"


def upload_local_file(file_path: str, remote_path: str, content_type: str | None = None) -> tuple[str, str]:
    bucket = _get_bucket()
    kwargs = {"local_file": file_path, "file_name": remote_path}
    if content_type:
        kwargs["content_type"] = content_type
    bucket.upload_local_file(**kwargs)
    return remote_path, build_public_asset_url(remote_path)


def upload_preview_bytes(model_filename: str, data: bytes, content_type: str, extension: str) -> tuple[str, str]:
    bucket = _get_bucket()
    preview_path = build_preview_path(model_filename, extension)
    bucket.upload_bytes(
        data_bytes=data,
        file_name=preview_path,
        content_type=content_type,
    )
    return preview_path, build_preview_url(preview_path)
