# app/models/model_metadata.py
from pydantic import BaseModel, Field
from typing import Optional

class ModelMetadata(BaseModel):
    id: Optional[str] = None
    name: str
    filename: str
    description: Optional[str] = None