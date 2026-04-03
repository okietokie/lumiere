from datetime import date, datetime
from typing import Any

from bson import ObjectId


def utcnow() -> datetime:
    return datetime.utcnow()


def to_iso(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def serialize_document(value: Any) -> Any:
    if isinstance(value, list):
        return [serialize_document(item) for item in value]
    if isinstance(value, dict):
        serialized: dict[str, Any] = {}
        for key, item in value.items():
            if key == "_id":
                serialized["id"] = str(item)
            else:
                serialized[key] = serialize_document(item)
        return serialized
    if isinstance(value, ObjectId):
        return str(value)
    return to_iso(value)
