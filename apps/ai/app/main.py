import logging
import os

from dotenv import load_dotenv
load_dotenv()  # load .env before any module reads env vars

from fastapi import FastAPI, HTTPException

from models import ExtractRequest, ExtractResponse, HealthResponse
from storage import download_file_from_minio
from preprocessing import preprocess
from ocr import run_ocr
from extraction import extract_fields

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AgriDoc AI Worker",
    description="OCR extraction service for agrifood documents",
    version="1.0.0",
)


@app.get("/", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", version="1.0.0")


@app.post("/extract", response_model=ExtractResponse)
def extract(request: ExtractRequest):
    local_path = None

    try:
        logger.info(f"[1/4] Downloading: {request.storagePath}")
        local_path = download_file_from_minio(request.storagePath)

        logger.info("[2/4] Running OpenCV preprocessing")
        clean_image = preprocess(local_path)

        logger.info("[3/4] Running Tesseract OCR")
        raw_text = run_ocr(clean_image)
        logger.info(f"      Extracted {len(raw_text)} characters")

        if not raw_text:
            raise ValueError("OCR returned empty text — document may be unreadable")

        logger.info(f"[4/4] Extracting fields for type: {request.documentType}")
        payload, confidence = extract_fields(request.documentType, raw_text)
        logger.info(f"      Done. Confidence: {confidence}%")

        return ExtractResponse(
            payload=payload,
            confidence=confidence,
            raw_text=raw_text,
        )

    except RuntimeError as e:
        logger.error(f"Storage error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

    except ValueError as e:
        logger.error(f"Processing error: {e}")
        raise HTTPException(status_code=422, detail=str(e))

    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal extraction error")

    finally:
        if local_path and os.path.exists(local_path):
            os.unlink(local_path)
            logger.info(f"Cleaned up temp file: {local_path}")
