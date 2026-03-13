from pydantic import BaseModel
from typing import Any, Optional


class ExtractRequest(BaseModel):
    storagePath: str
    documentType: str
    callbackUrl: str          # <-- NEW: where to POST results when done


class ExtractResponse(BaseModel):
    payload: dict[str, Any]
    confidence: float
    raw_text: str


class AcceptedResponse(BaseModel):
    status: str
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str
