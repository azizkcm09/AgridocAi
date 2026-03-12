"""
Field extraction — sends OCR text to the LLM and parses the JSON response.

Before (regex):  brittle patterns that only worked for invoices.
After  (LLM):    prompt engineering handles all doc types, OCR noise, and layout variations.

Flow:
  1. get_prompt() builds the right prompt for the document type
  2. ask() sends it to Groq (Llama 3.3 70B)
  3. We parse the JSON response and compute a confidence score
"""

import json
import logging
import re

from llm import ask
from prompts import get_prompt

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
