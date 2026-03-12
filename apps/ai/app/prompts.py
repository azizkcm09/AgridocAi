"""
Prompt templates for LLM-based document field extraction.

Each function takes raw OCR text and returns a complete prompt string.
The prompts are designed to produce deterministic, parseable JSON output.

Prompt engineering principles applied:
  1. Role assignment — gives the LLM domain expertise context
  2. Explicit JSON schema — exact field names, types, descriptions
  3. Null over hallucination — "never guess or invent data"
  4. Output-only — "return ONLY valid JSON" prevents markdown wrappers
  5. Examples — one-shot example anchors the expected output format
"""

# --- Shared system preamble (reused across all doc types) ---
_SYSTEM_PREAMBLE = (
    "You are a document data extraction specialist for agrifood and supply chain operations. "
    "You will receive raw OCR text extracted from a scanned document. "
    "Your job is to extract structured fields and return them as a JSON object.\n\n"
    "Rules:\n"
    "- Return ONLY a valid JSON object. No markdown, no code fences, no explanation.\n"
    "- If a field cannot be found in the text, set its value to null.\n"
    "- Never guess or invent data that is not present in the text.\n"
    "- Clean up OCR artifacts (extra spaces, broken words) when extracting values.\n"
)


def invoice_prompt(ocr_text: str) -> str:
    """
    Prompt for extracting fields from agrifood invoices.

    Expected fields:
      - vendorName: company that issued the invoice
      - totalAmount: final amount due (number)
      - invoiceDate: date on the invoice (string, any format found)
      - currency: 3-letter ISO code (USD, EUR, GBP, DZD, etc.)
      - invoiceNumber: unique invoice identifier
      - buyerName: company or person being billed
      - lineItems: list of items with description, quantity, unitPrice
    """
    return (
        f"{_SYSTEM_PREAMBLE}"
        "Extract the following fields from this INVOICE document:\n\n"
        "{\n"
        '  "vendorName": "string — company that issued the invoice",\n'
        '  "buyerName": "string — company or person being billed",\n'
        '  "invoiceNumber": "string — unique invoice identifier",\n'
        '  "invoiceDate": "string — date on the invoice, preserve original format",\n'
        '  "totalAmount": "number — final total amount due (numeric, no currency symbol)",\n'
        '  "currency": "string — 3-letter ISO currency code (USD, EUR, GBP, DZD, MAD, TND, etc.)",\n'
        '  "lineItems": [\n'
        '    {\n'
        '      "description": "string — item or service description",\n'
        '      "quantity": "number",\n'
        '      "unitPrice": "number"\n'
        '    }\n'
        '  ]\n'
        "}\n\n"
        "Example output:\n"
        "{\n"
        '  "vendorName": "AgriFresh Supplies Ltd",\n'
        '  "buyerName": "Metro Farms Co",\n'
        '  "invoiceNumber": "INV-2026-0042",\n'
        '  "invoiceDate": "15/02/2026",\n'
        '  "totalAmount": 12500.00,\n'
        '  "currency": "EUR",\n'
        '  "lineItems": [\n'
        '    {"description": "Organic Wheat Flour 25kg", "quantity": 100, "unitPrice": 75.00},\n'
        '    {"description": "Cold-pressed Olive Oil 5L", "quantity": 50, "unitPrice": 95.00}\n'
        '  ]\n'
        "}\n\n"
        "--- OCR TEXT START ---\n"
        f"{ocr_text}\n"
        "--- OCR TEXT END ---\n"
    )


def certificate_prompt(ocr_text: str) -> str:
    """
    Prompt for extracting fields from agrifood compliance certificates.
    Examples: phytosanitary certificates, organic certifications, food safety certs,
    HACCP, ISO 22000, halal/kosher certificates.
    """
    return (
        f"{_SYSTEM_PREAMBLE}"
        "Extract the following fields from this CERTIFICATE document:\n\n"
        "{\n"
        '  "certificateType": "string — type of certificate (e.g. Phytosanitary, Organic, HACCP, ISO 22000, Halal, Kosher, Food Safety)",\n'
        '  "certificateNumber": "string — unique certificate identifier",\n'
        '  "issuingAuthority": "string — organization that issued the certificate",\n'
        '  "holderName": "string — company or person the certificate is issued to",\n'
        '  "issueDate": "string — date the certificate was issued",\n'
        '  "expiryDate": "string — date the certificate expires, null if not present",\n'
        '  "productsCovered": "string — products or categories covered by this certificate",\n'
        '  "status": "string — VALID, EXPIRED, SUSPENDED, or null if not stated"\n'
        "}\n\n"
        "Example output:\n"
        "{\n"
        '  "certificateType": "Phytosanitary Certificate",\n'
        '  "certificateNumber": "CERT-DZ-2026-1834",\n'
        '  "issuingAuthority": "Ministry of Agriculture — Plant Protection Directorate",\n'
        '  "holderName": "AgroExport Algeria SARL",\n'
        '  "issueDate": "01/03/2026",\n'
        '  "expiryDate": "01/03/2027",\n'
        '  "productsCovered": "Fresh citrus fruits (oranges, lemons)",\n'
        '  "status": "VALID"\n'
        "}\n\n"
        "--- OCR TEXT START ---\n"
        f"{ocr_text}\n"
        "--- OCR TEXT END ---\n"
    )


def report_prompt(ocr_text: str) -> str:
    """
    Prompt for extracting fields from agrifood lab/inspection reports.
    Examples: quality inspection reports, lab test results, audit reports.
    """
    return (
        f"{_SYSTEM_PREAMBLE}"
        "Extract the following fields from this REPORT document:\n\n"
        "{\n"
        '  "reportTitle": "string — title or subject of the report",\n'
        '  "reportNumber": "string — unique report identifier",\n'
        '  "authorOrLab": "string — person, lab, or organization that produced the report",\n'
        '  "reportDate": "string — date the report was issued",\n'
        '  "subjectProduct": "string — product or batch being reported on",\n'
        '  "conclusion": "string — overall finding: PASS, FAIL, CONDITIONAL, or a brief summary",\n'
        '  "keyFindings": ["string — list of important findings or test results"]\n'
        "}\n\n"
        "Example output:\n"
        "{\n"
        '  "reportTitle": "Pesticide Residue Analysis — Batch TOM-2026-Q1",\n'
        '  "reportNumber": "LAB-RPT-0587",\n'
        '  "authorOrLab": "National Food Safety Laboratory",\n'
        '  "reportDate": "10/03/2026",\n'
        '  "subjectProduct": "Cherry Tomatoes — Batch TOM-2026-Q1",\n'
        '  "conclusion": "PASS",\n'
        '  "keyFindings": [\n'
        '    "All 12 pesticide residues below MRL thresholds",\n'
        '    "Heavy metals (Pb, Cd) not detected",\n'
        '    "Microbiological counts within acceptable limits"\n'
        '  ]\n'
        "}\n\n"
        "--- OCR TEXT START ---\n"
        f"{ocr_text}\n"
        "--- OCR TEXT END ---\n"
    )


def unknown_prompt(ocr_text: str) -> str:
    """
    Fallback prompt for unclassified documents.
    Asks the LLM to identify the document type and extract whatever it can.
    """
    return (
        f"{_SYSTEM_PREAMBLE}"
        "The document type is unknown. Analyze the text and extract:\n\n"
        "{\n"
        '  "detectedType": "string — your best guess: INVOICE, CERTIFICATE, REPORT, or OTHER",\n'
        '  "title": "string — document title or subject if found",\n'
        '  "date": "string — any date found on the document",\n'
        '  "organization": "string — primary company or authority mentioned",\n'
        '  "summary": "string — 1-2 sentence summary of the document content"\n'
        "}\n\n"
        "--- OCR TEXT START ---\n"
        f"{ocr_text}\n"
        "--- OCR TEXT END ---\n"
    )


def get_prompt(document_type: str, ocr_text: str) -> str:
    """
    Factory function — returns the right prompt for the given document type.

    Args:
        document_type: One of INVOICE, CERTIFICATE, REPORT, UNKNOWN
        ocr_text: Raw OCR text extracted from the document image.

    Returns:
        A complete prompt string ready to send to the LLM.
    """
    prompts = {
        "INVOICE": invoice_prompt,
        "CERTIFICATE": certificate_prompt,
        "REPORT": report_prompt,
    }
    builder = prompts.get(document_type.upper(), unknown_prompt)
    return builder(ocr_text)
