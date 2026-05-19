# `apps/ai` — FastAPI AI Worker

The intelligence layer. Takes a document key, runs the OCR + LLM pipeline, classifies the document, extracts its fields, and POSTs the result back to the NestJS API. Has no database access of its own — everything it learns about a document comes from the job payload, and everything it returns goes through the callback URL the API gave it.

## Pipeline at a glance

```
NestJS  →  POST /extract  →  background thread
                              │
                              ├─ MinIO    : download file
                              ├─ OpenCV   : deskew + denoise
                              ├─ Tesseract: OCR
                              ├─ Groq     : classify (if type=UNKNOWN)
                              ├─ Groq     : type-specific extraction
                              └─ POST callbackUrl with payload + confidences
```

Two-stage by design: classification uses only the first ~3 000 characters of OCR text (cheap), then the type-specific extraction prompt runs on the full text. See [`docs/architecture.md`](../../docs/architecture.md) for the full sequence diagram.

## File layout

| File | Purpose |
|---|---|
| `app/main.py` | FastAPI app — `GET /` health + `POST /extract` accept-and-thread |
| `app/preprocessing.py` | OpenCV-based deskew, denoise, threshold |
| `app/ocr.py` | Tesseract wrapper (`--oem 3 --psm 6`) |
| `app/llm.py` | Groq client singleton, `ask(prompt) -> str` |
| `app/prompts.py` | Type-specific extraction prompts + `classify_prompt` + factory |
| `app/extraction.py` | `classify()`, `extract_fields()`, confidence scoring |
| `app/storage.py` | MinIO download helper (boto3) |
| `app/models.py` | Pydantic request/response models |

## Environment variables

| Key | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | yes | Groq SDK auth — get one from <https://groq.com> |
| `AI_CALLBACK_SECRET` | yes | Stamped onto every callback as `x-api-key`. Must match the API's `AI_CALLBACK_SECRET` |
| `S3_ENDPOINT` | yes | MinIO endpoint (e.g. `http://localhost:9000`) |
| `S3_REGION` | yes | Any value (MinIO ignores it but boto3 wants it) |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | yes | MinIO credentials |
| `S3_BUCKET` | yes | Bucket name (defaults to `documents` in the compose file) |

Put them in `apps/ai/.env`. There is no schema validation today — the app crashes on the first missing one.

## Prompt strategy

The model used is `llama-3.3-70b-versatile` via Groq. Temperature is set to 0 because the goal is deterministic JSON, not creativity.

- **System preamble** (`_SYSTEM_PREAMBLE` in `prompts.py`) tells the model it is a document-extraction specialist for agrifood, lists the rules ("JSON only", "null over hallucination"), and asks for raw JSON without code fences.
- **Type-specific prompts** declare the exact JSON shape with field descriptions and a one-shot agrifood-flavoured example. There is one prompt per `DocumentType`.
- **Classifier prompt** lists the four classes, asks for `{type, confidence, reasoning}`, and ships four short one-shot examples.
- **Confidence** for extraction is computed locally in `_compute_confidence()` using a weight table per type (vendorName weighs more than buyerName on an INVOICE, etc.). Classification confidence is whatever the model returned, clamped to `[0, 1]` and then surfaced to the API as a 0–100 percentage to line up with the extraction confidence.

## Running locally

```bash
cd apps/ai
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt

# Make sure Tesseract is installed on the host (with the languages you need):
#   macOS:    brew install tesseract
#   Ubuntu:   sudo apt install tesseract-ocr tesseract-ocr-fra

PYTHONPATH=app uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The service exposes:

- `GET /` — health probe used by the API's `/health` endpoint.
- `POST /extract` — accept-and-thread. Returns 202 immediately; the actual work runs on a daemon `threading.Thread`. When done it POSTs to `callbackUrl` with the extracted payload.

## Manually testing the pipeline

If you want to exercise `/extract` outside of the NestJS app, drop a file in MinIO (e.g. via the console at <http://localhost:9001>), grab its key, and curl:

```bash
curl -X POST http://localhost:8000/extract \
  -H 'Content-Type: application/json' \
  -d '{
    "storagePath": "uploads/<your-key>.pdf",
    "documentType": "UNKNOWN",
    "callbackUrl": "https://webhook.site/<your-uuid>"
  }'
```

The callback will land on webhook.site with the extracted payload, the detected type, and the two confidence numbers.

## Future work (not in scope right now)

- Stuck-job watchdog (today, if the AI process crashes mid-job, the API has no built-in watcher).
- Multi-language OCR — Tesseract is already running, just needs `lang='eng+fra'` exposed and the right language packs in the container.
- Switch from in-thread to a real queue (Celery, Arq) once we move past a single-worker setup.
