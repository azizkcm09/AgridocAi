import logging
import os
import threading

from dotenv import load_dotenv
load_dotenv()  # load .env before any module reads env vars

import httpx
from fastapi import FastAPI, HTTPException

from models import ExtractRequest, AcceptedResponse, HealthResponse
from storage import download_file_from_minio
from preprocessing import preprocess
from ocr import run_ocr
from extraction import classify, extract_fields

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


def _process_and_callback(storage_path: str, document_type: str, callback_url: str):
    """
    Heavy lifting — runs in a background thread.

    1. Download the file from MinIO
    2. Preprocess the image (OpenCV)
    3. Run OCR (Tesseract)
    4. If documentType is UNKNOWN: classify first, then extract with the detected type.
       Otherwise: trust the caller's type and extract directly.
    5. POST the results back to NestJS via callbackUrl, including the
       detectedType + classificationConfidence so the API knows whether the
       AI decided the type or whether the user pre-selected it.
    """
    local_path = None
    callback_headers = {"x-api-key": os.getenv("AI_CALLBACK_SECRET", "")}

    try:
        logger.info(f"[1/6] Downloading: {storage_path}")
        local_path = download_file_from_minio(storage_path)

        logger.info("[2/6] Running OpenCV preprocessing")
        clean_image = preprocess(local_path)

        logger.info("[3/6] Running Tesseract OCR")
        raw_text = run_ocr(clean_image)
        logger.info(f"      Extracted {len(raw_text)} characters")

        if not raw_text:
            raise ValueError("OCR returned empty text — document may be unreadable")

        # Classify when the caller did not commit to a type (UNKNOWN means
        # "let the AI decide"). When a type was explicitly chosen we keep
        # backwards-compatible behaviour and skip classification.
        incoming_type = (document_type or "UNKNOWN").upper()
        classification_confidence: float | None = None
        detected_type: str | None = None

        if incoming_type == "UNKNOWN":
            logger.info("[4/6] Classifying document (caller sent UNKNOWN)")
            classification = classify(raw_text)
            detected_type = classification["type"]
            classification_confidence = classification["confidence"]
            effective_type = detected_type
            logger.info(
                f"      Detected {detected_type} (confidence={classification_confidence:.2f}) — "
                f"reasoning: {classification['reasoning']}"
            )
        else:
            logger.info(f"[4/6] Skipping classification (caller pre-selected {incoming_type})")
            effective_type = incoming_type

        logger.info(f"[5/6] Extracting fields for type: {effective_type}")
        payload, confidence = extract_fields(effective_type, raw_text)
        logger.info(f"      Done. Extraction confidence: {confidence}%")

        # 6. POST results back to NestJS
        logger.info(f"[6/6] Sending callback to {callback_url}")
        callback_payload = {
            "payload": payload,
            "confidence": confidence,
            "rawText": raw_text,
        }
        if detected_type is not None:
            callback_payload["detectedType"] = detected_type
            # The API stores classificationConfidence as a 0-100 percentage
            # so the UI badges line up with the existing extraction confidence.
            callback_payload["classificationConfidence"] = round(classification_confidence * 100, 2)

        response = httpx.post(
            callback_url,
            json=callback_payload,
            headers=callback_headers,
            timeout=15.0,
        )
        response.raise_for_status()
        logger.info(f"Callback successful: {response.status_code}")

    except Exception as e:
        logger.exception(f"Background processing failed: {e}")
        # Notify NestJS that processing failed so the doc doesn't stay stuck in PROCESSING
        try:
            error_url = callback_url.replace("/extraction-callback", "/extraction-error")
            httpx.post(error_url, json={"error": str(e)}, headers=callback_headers, timeout=10.0)
        except Exception as cb_err:
            logger.error(f"Error callback also failed: {cb_err}")

    finally:
        if local_path and os.path.exists(local_path):
            os.unlink(local_path)
            logger.info(f"Cleaned up temp file: {local_path}")


@app.post("/extract", response_model=AcceptedResponse)
def extract(request: ExtractRequest):
    """
    Accepts an extraction job and processes it in the background.

    Returns immediately with status=accepted.
    When processing is done, results are POSTed to the callbackUrl.
    """
    logger.info(f"Received extraction job: {request.storagePath} → callback: {request.callbackUrl}")

    # Spawn background thread — the endpoint returns immediately
    thread = threading.Thread(
        target=_process_and_callback,
        args=(request.storagePath, request.documentType, request.callbackUrl),
        daemon=True,   # daemon=True means the thread dies when the main process exits
    )
    thread.start()

    return AcceptedResponse(
        status="accepted",
        message="Extraction job started. Results will be sent to callback URL.",
    )
