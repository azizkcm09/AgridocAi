"""
Two-stage document understanding — classify the document, then extract its fields.

The pipeline is split in two so the upload UI does not have to ask the user
to pick a document type manually. When the API forwards a document with type
UNKNOWN, the AI service runs `classify()` first, then dispatches to the right
type-specific extractor via `extract_fields()`.

Flow when type is UNKNOWN:
  1. classify(ocr_text) -> {type, confidence}  (cheap call, page-1 only)
  2. extract_fields(type, ocr_text) -> (payload, confidence)  (full extraction)

Flow when caller already knows the type (legacy/explicit path):
  1. extract_fields(type, ocr_text)  (skip classification)

Two distinct confidence numbers are surfaced:
  - classification confidence — how sure the model is about the *type*.
  - extraction confidence — how *complete* the extracted payload is, scored
    locally with a per-field weight table in FIELD_WEIGHTS.

They are kept separate because a document can be confidently classified
but poorly extracted (e.g. bottom of the page cropped in the scan), and
the UI shows both so the reviewer knows which part the AI was unsure about.
"""

import json
import logging
import re

from llm import ask
from prompts import classify_prompt, get_prompt

logger = logging.getLogger(__name__)

# Expected fields per document type — used for confidence scoring.
# Each field has a weight (%) reflecting its importance for that doc type.
FIELD_WEIGHTS = {
    "INVOICE": {
        "vendorName": 20,
        "buyerName": 10,
        "invoiceNumber": 10,
        "invoiceDate": 15,
        "totalAmount": 25,
        "currency": 10,
        "lineItems": 10,
    },
    "CERTIFICATE": {
        "certificateType": 15,
        "certificateNumber": 15,
        "issuingAuthority": 15,
        "holderName": 15,
        "issueDate": 15,
        "expiryDate": 10,
        "productsCovered": 10,
        "status": 5,
    },
    "REPORT": {
        "reportTitle": 15,
        "reportNumber": 10,
        "authorOrLab": 15,
        "reportDate": 15,
        "subjectProduct": 15,
        "conclusion": 20,
        "keyFindings": 10,
    },
    "UNKNOWN": {
        "detectedType": 20,
        "title": 20,
        "date": 20,
        "organization": 20,
        "summary": 20,
    },
}


def _compute_confidence(payload: dict, document_type: str) -> float:
    """
    Score how complete the extraction is (0–100).

    Each expected field has a weight. If the LLM returned a non-null value
    for that field, its weight counts toward the total confidence.

    Example: an invoice with vendorName + totalAmount + currency filled
    but missing invoiceDate = 20 + 25 + 10 = 55%.
    """
    weights = FIELD_WEIGHTS.get(document_type.upper(), FIELD_WEIGHTS["UNKNOWN"])
    score = 0.0
    for field, weight in weights.items():
        value = payload.get(field)
        # Consider a field "filled" if it's not None/null and not empty
        if value is not None and value != "" and value != []:
            score += weight
    return round(score, 2)


def _parse_llm_response(raw_response: str) -> dict:
    """
    Parse the LLM's text response into a Python dict.

    Handles edge cases:
      - LLM wraps JSON in ```json ... ``` markdown fences
      - LLM adds explanation text before/after the JSON
      - LLM returns invalid JSON (falls back to empty dict)
    """
    text = raw_response.strip()

    # Strip markdown code fences if present: ```json ... ```
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    # Try to find JSON object in the response
    # Look for the first { and last } to extract the JSON block
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse LLM response as JSON: {e}")
        logger.debug(f"Raw response was: {raw_response[:500]}")
        return {}


# Length cap fed to the classifier — page 1 is usually well under this in
# OCR-text terms, and the classifier only needs a few hundred characters to
# decide. Keeps the prompt cheap and predictable.
_CLASSIFY_TEXT_CAP = 3000

# Valid output classes the classifier is allowed to produce
_VALID_TYPES = {"INVOICE", "CERTIFICATE", "REPORT", "UNKNOWN"}


def classify(text: str) -> dict:
    """
    First-pass document classification.

    Returns:
        {
          "type": "INVOICE" | "CERTIFICATE" | "REPORT" | "UNKNOWN",
          "confidence": 0.0 - 1.0,
          "reasoning": "string"
        }

    Falls back to UNKNOWN with confidence 0.0 when the LLM response cannot
    be parsed — the document still gets routed to the UNKNOWN extractor and
    HITL handles the rest.
    """
    snippet = (text or "")[:_CLASSIFY_TEXT_CAP]
    if not snippet.strip():
        logger.warning("classify(): empty OCR text, returning UNKNOWN")
        return {"type": "UNKNOWN", "confidence": 0.0, "reasoning": "Empty OCR text"}

    prompt = classify_prompt(snippet)
    logger.info(f"Classifying document ({len(snippet)} chars sent to LLM)")
    raw_response = ask(prompt)
    parsed = _parse_llm_response(raw_response)

    detected = str(parsed.get("type", "UNKNOWN")).upper().strip()
    if detected not in _VALID_TYPES:
        logger.warning(f"classify(): LLM returned invalid type '{detected}', falling back to UNKNOWN")
        detected = "UNKNOWN"

    try:
        confidence = float(parsed.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    reasoning = str(parsed.get("reasoning", "")).strip()[:300]

    logger.info(f"Classified as {detected} (confidence={confidence:.2f})")
    return {"type": detected, "confidence": confidence, "reasoning": reasoning}


def extract_fields(document_type: str, text: str) -> tuple:
    """
    Main extraction function — called by main.py's /extract endpoint.

    Args:
        document_type: One of INVOICE, CERTIFICATE, REPORT, UNKNOWN
        text: Raw OCR text from the scanned document.

    Returns:
        (payload, confidence) — the extracted fields dict and a 0-100 score.
    """
    doc_type = document_type.upper()

    # 1. Build the prompt for this document type
    prompt = get_prompt(doc_type, text)

    # 2. Send to LLM
    logger.info(f"Sending {doc_type} text ({len(text)} chars) to LLM")
    raw_response = ask(prompt)
    logger.info(f"LLM response received ({len(raw_response)} chars)")

    # 3. Parse JSON from the response
    payload = _parse_llm_response(raw_response)

    if not payload:
        # LLM returned unparseable response — fall back to raw text
        logger.warning("LLM returned no parseable JSON, falling back to raw text")
        return {"raw": text[:500]}, 0.0

    # 4. Remove null values from payload (keep it clean for the frontend)
    payload = {k: v for k, v in payload.items() if v is not None}

    # 5. Compute confidence based on field completeness
    confidence = _compute_confidence(payload, doc_type)

    return payload, confidence
