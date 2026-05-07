"""
VerifiDoc AI - Main FastAPI Application
Real-time Document Anomaly Detection & Fraud Prevention
"""

import os
import uuid
import shutil
import logging
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models.schemas import VerificationResult, HealthResponse
from services.ocr_service import OCRService
from services.metadata_service import MetadataService
from services.anomaly_service import AnomalyService
from services.risk_engine import RiskEngine
from utils.helpers import save_upload, cleanup_temp_file, is_valid_file_type

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("verifidoc")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="VerifiDoc AI",
    description="Intelligent real-time document verification and anomaly detection platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = Path("temp_uploads")
TEMP_DIR.mkdir(exist_ok=True)

# ── Service singletons ────────────────────────────────────────────────────────
ocr_service      = OCRService()
metadata_service = MetadataService()
anomaly_service  = AnomalyService()
risk_engine      = RiskEngine()


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="operational",
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat(),
        services={
            "ocr":      ocr_service.is_available(),
            "metadata": True,
            "anomaly":  True,
            "risk":     True,
        },
    )


@app.post("/api/verify", response_model=VerificationResult)
async def verify_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Accepts a document (PDF / JPEG / PNG), runs the full verification
    pipeline and returns a structured risk assessment.
    """
    # ── Validate ──────────────────────────────────────────────────────────────
    if not is_valid_file_type(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF, JPEG, or PNG.",
        )

    if file.size and file.size > 20 * 1024 * 1024:  # 20 MB guard
        raise HTTPException(status_code=413, detail="File exceeds 20 MB limit.")

    # ── Persist to temp ───────────────────────────────────────────────────────
    doc_id   = str(uuid.uuid4())
    tmp_path = TEMP_DIR / f"{doc_id}_{file.filename}"
    await save_upload(file, tmp_path)

    logger.info("Received document [%s] id=%s size=%s bytes", file.filename, doc_id, tmp_path.stat().st_size)

    try:
        # ── Stage 1 : Metadata Analysis ───────────────────────────────────────
        logger.info("[%s] Running metadata analysis …", doc_id)
        metadata_result = metadata_service.analyze(str(tmp_path))

        # ── Stage 2 : OCR Text Extraction ─────────────────────────────────────
        logger.info("[%s] Running OCR …", doc_id)
        ocr_result = ocr_service.extract(str(tmp_path))

        # ── Stage 3 : Visual / Pixel Anomaly Detection ────────────────────────
        logger.info("[%s] Running anomaly detection …", doc_id)
        anomaly_result = anomaly_service.analyze(str(tmp_path), ocr_result)

        # ── Stage 4 : Risk Score Calculation ──────────────────────────────────
        logger.info("[%s] Calculating risk score …", doc_id)
        risk_result = risk_engine.calculate(metadata_result, ocr_result, anomaly_result)

        result = VerificationResult(
            document_id=doc_id,
            filename=file.filename,
            file_type=Path(file.filename).suffix.lower().lstrip("."),
            file_size_kb=round(tmp_path.stat().st_size / 1024, 2),
            timestamp=datetime.utcnow().isoformat(),
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            anomalies=risk_result["anomalies"],
            metadata_flags=metadata_result.get("flags", []),
            ocr_confidence=ocr_result.get("confidence", 0.0),
            extracted_fields=ocr_result.get("fields", {}),
            recommendations=risk_result["recommendations"],
            processing_time_ms=risk_result["processing_time_ms"],
        )

        logger.info("[%s] Verification complete — risk_score=%s level=%s",
                    doc_id, result.risk_score, result.risk_level)

        return result

    except Exception as exc:
        logger.error("[%s] Pipeline error: %s", doc_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Verification pipeline failed: {str(exc)}")

    finally:
        background_tasks.add_task(cleanup_temp_file, str(tmp_path))


@app.post("/api/verify/batch")
async def verify_batch(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
):
    """Verify multiple documents in a single request (max 5)."""
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 documents per batch.")

    results = []
    for file in files:
        try:
            # Reuse the single-file logic via internal call
            result = await verify_document(background_tasks, file)
            results.append(result)
        except HTTPException as exc:
            results.append({"filename": file.filename, "error": exc.detail})

    return {"batch_id": str(uuid.uuid4()), "results": results, "total": len(results)}


@app.get("/")
async def root():
    return {"message": "VerifiDoc AI is running. Visit /api/docs for the API reference."}
