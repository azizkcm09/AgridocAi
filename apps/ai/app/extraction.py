import re
from typing import Optional


VENDOR_PATTERNS = [
    r"(?:vendor|supplier|from|billed\s+by|sold\s+by)[:\s]+([A-Za-z0-9\s&.,'\-]{3,60})",
    r"(?:company|firm|business)[:\s]+([A-Za-z0-9\s&.,'\-]{3,60})",
]

AMOUNT_PATTERNS = [
    r"(?:grand\s+total|total\s+amount\s+due|amount\s+due|total\s+due|total)[:\s]*[$€£]?\s*([\d,]+(?:\.\d{2})?)",
    r"(?:invoice\s+total|balance\s+due)[:\s]*[$€£]?\s*([\d,]+(?:\.\d{2})?)",
]

DATE_PATTERNS = [
    r"(?:invoice\s+date|date\s+of\s+invoice|date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",
    r"(?:invoice\s+date|date)[:\s]+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})",
]

CURRENCY_PATTERNS = [
    r"\b(USD|EUR|GBP|CHF|CAD|AUD|DZD|MAD|TND)\b",
    r"(?:currency)[:\s]+([A-Z]{3})",
]


def _first_match(text: str, patterns: list) -> Optional[str]:
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def _parse_amount(raw: Optional[str]) -> Optional[float]:
    if not raw:
        return None
    try:
        return float(raw.replace(",", ""))
    except ValueError:
        return None


def _confidence(fields: dict) -> float:
    weights = {
        "vendorName":  30.0,
        "totalAmount": 40.0,
        "invoiceDate": 20.0,
        "currency":    10.0,
    }
    score = sum(w for f, w in weights.items() if fields.get(f) is not None)
    return round(score, 2)


def extract_invoice_fields(text: str) -> tuple:
    vendor   = _first_match(text, VENDOR_PATTERNS)
    amount   = _parse_amount(_first_match(text, AMOUNT_PATTERNS))
    date     = _first_match(text, DATE_PATTERNS)
    currency = _first_match(text, CURRENCY_PATTERNS)

    if not currency:
        if "$" in text: currency = "USD"
        elif "€" in text: currency = "EUR"
        elif "£" in text: currency = "GBP"

    fields = {
        "vendorName":  vendor,
        "totalAmount": amount,
        "invoiceDate": date,
        "currency":    currency,
    }

    confidence = _confidence(fields)
    payload = {k: v for k, v in fields.items() if v is not None}

    return payload, confidence


def extract_fields(document_type: str, text: str) -> tuple:
    if document_type.upper() == "INVOICE":
        return extract_invoice_fields(text)
    return {"raw": text[:500]}, 0.0
