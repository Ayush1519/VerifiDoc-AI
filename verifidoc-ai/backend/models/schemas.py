"""
VerifiDoc AI — Pydantic data models
"""

from typing import Any
from pydantic import BaseModel, Field


class AnomalyItem(BaseModel):
    type: str = Field(..., description="Category of anomaly, e.g. 'ELA_TAMPERING'")
    severity: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    description: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    location: str | None = Field(None, description="Region of document where anomaly was found")


class VerificationResult(BaseModel):
    document_id: str
    filename: str
    file_type: str
    file_size_kb: float
    timestamp: str

    # Risk assessment
    risk_score: int = Field(..., ge=0, le=100, description="0 = clean, 100 = definite fraud")
    risk_level: str = Field(..., description="LOW | MODERATE | HIGH | CRITICAL")
    anomalies: list[AnomalyItem]

    # Metadata
    metadata_flags: list[str]
    ocr_confidence: float = Field(..., ge=0.0, le=1.0)
    extracted_fields: dict[str, Any]

    # Guidance
    recommendations: list[str]
    processing_time_ms: int


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    services: dict[str, bool]
