from pydantic import BaseModel
from typing import Any


class ExtractRequest(BaseModel):
    storagePath: str
    documentType: str


class ExtractResponse(BaseModel):
    payload: dict[str, Any]
    confidence: float
    raw_text: str


class HealthResponse(BaseModel):
    status: str
    version: str
