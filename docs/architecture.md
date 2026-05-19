# AgriDoc AI — Architecture

This document is the deep-dive companion to the root README. It covers the system topology, the document-processing sequence, the data model, and the authentication flow. All diagrams are written in Mermaid so they live in version control and render directly on GitHub.

---

## 1. System topology

AgriDoc AI is three apps + three infrastructure components, all running side by side. The web app talks to the API only; it never reaches the AI worker directly. Files travel through MinIO using presigned URLs so the API does not have to proxy bytes.

```mermaid
flowchart LR
  classDef app fill:#DCE3D3,stroke:#3F5640,color:#1F2421
  classDef infra fill:#F4E4CB,stroke:#A2641D,color:#1F2421
  classDef ext fill:#F1DAD0,stroke:#B6553A,color:#1F2421

  user((Reviewer))

  W[Next.js 15<br/>apps/web]:::app
  A[NestJS API<br/>apps/api]:::app
  P[FastAPI worker<br/>apps/ai]:::app

  DB[(PostgreSQL)]:::infra
  Q[(Redis<br/>BullMQ)]:::infra
  S[(MinIO<br/>S3-compatible)]:::infra

  G[Groq<br/>llama-3.3-70b]:::ext

  user --> W
  W -- "JWT REST" --> A
  W -- "presigned PUT (file bytes)" --> S
  A -- "Prisma" --> DB
  A -- "enqueue extract job" --> Q
  Q --> A
  A -- "POST /extract" --> P
  P -- "GetObject" --> S
  P -- "chat completion" --> G
  P -- "POST extraction-callback" --> A
```

The Reviewer never sees the AI worker. The API treats it as a fire-and-forget service that calls back when it is done. This decoupling means the AI service can be redeployed, scaled, or replaced without touching the rest of the system, as long as the callback contract holds.

---

## 2. End-to-end sequence — upload to validated

The "golden path" the demo follows: a reviewer drops a PDF, the AI classifies it as `INVOICE`, extracts its fields, and the reviewer validates the result.

```mermaid
sequenceDiagram
    autonumber
    participant U as Reviewer
    participant W as Web
    participant A as API
    participant Q as BullMQ
    participant P as AI
    participant S as MinIO
    participant DB as Postgres
    participant G as Groq

    U->>W: select file on /upload
    W->>A: POST /storage/presigned-url
    A-->>W: { uploadUrl, key }  (5 min expiry)
    W->>S: PUT file (bytes go direct)
    W->>A: POST /documents (originalName, key, mimeType, size, type=UNKNOWN)
    A->>DB: INSERT Document (status=PENDING)
    A->>Q: queue.add("extract-data", { docId, key, userId })
    A-->>W: 201 (doc id)
    Note over Q,A: Worker picks up the job

    Q->>A: process(job)
    A->>DB: UPDATE Document SET status=PROCESSING
    A->>P: POST /extract { storagePath, documentType: UNKNOWN, callbackUrl }
    P-->>A: 202 accepted (returns immediately)

    Note over P: background thread
    P->>S: GetObject(storagePath)
    P->>P: OpenCV preprocess + Tesseract OCR
    P->>G: classify prompt (page-1 text)
    G-->>P: { type: INVOICE, confidence: 0.94 }
    P->>G: extract prompt (full text, INVOICE schema)
    G-->>P: { vendorName, totalAmount, ... }
    P->>A: POST /documents/{id}/extraction-callback<br/>{ payload, confidence, detectedType, classificationConfidence }<br/>x-api-key: AI_CALLBACK_SECRET

    A->>DB: UPSERT ExtractedData<br/>UPDATE Document.type = detectedType,<br/>detectedType, classificationConfidence,<br/>status=REVIEW_REQUIRED
    A->>DB: INSERT AuditLog (AUTO_EXTRACT)

    Note over U,W: Polling-while-pending picks this up
    W->>A: GET /documents/{id}
    A-->>W: document + extractedData

    U->>W: fix fields, mark missing as N/A
    W->>A: PATCH /documents/{id}/data
    A->>DB: UPSERT ExtractedData (payload, confidence=100)<br/>UPDATE Document.status=VALIDATED<br/>INSERT AuditLog (UPDATE_FIELD)
    A-->>W: 200 OK

    U->>W: Export PDF
    W->>A: GET /documents/{id}/export
    A-->>W: application/pdf (binary)
```

### Key contracts shown above

- **Presigned URLs** — short-lived (5 minutes), single-purpose. The API never holds file bytes.
- **`callbackUrl`** — every job carries the URL the AI must POST to when done, including its own `documentId`. The AI never invents URLs.
- **`x-api-key`** — every callback carries `AI_CALLBACK_SECRET`. The API rejects calls without it.
- **`type = UNKNOWN`** — the API uses this as the signal that the AI should classify. Any other value means "trust the caller", which preserves backwards compatibility for future integrations.

---

## 3. AI pipeline detail — classify, then extract

Inside the AI worker the work is split in two stages. Classification looks at page-1 OCR text only and decides the document class. Extraction then uses the type-specific prompt to pull structured fields.

```mermaid
sequenceDiagram
    autonumber
    participant A as API
    participant P as AI
    participant S as MinIO
    participant G as Groq

    A->>P: POST /extract { storagePath, documentType, callbackUrl }
    P-->>A: 202 accepted

    Note over P: background thread (daemon=True)
    P->>S: GetObject(storagePath)
    P->>P: preprocess.py (OpenCV: deskew + denoise)
    P->>P: ocr.py (Tesseract --oem 3 --psm 6)
    P-->>P: raw_text

    alt documentType == UNKNOWN
        P->>G: classify_prompt(raw_text[:3000])
        G-->>P: { type, confidence, reasoning }
        P-->>P: detected_type = parsed.type
    else explicit type
        P-->>P: detected_type = documentType  (no classify call)
    end

    P->>G: get_prompt(detected_type)(raw_text)
    G-->>P: { vendorName, totalAmount, ... } (JSON)
    P-->>P: parse + weighted confidence score

    P->>A: POST callbackUrl<br/>{ payload, confidence, rawText,<br/>  detectedType?, classificationConfidence? }
```

Confidence comes in two flavours, kept separate on purpose:
- **`classificationConfidence`** — how sure the model is about the *type*. Sourced directly from the classifier's JSON output.
- **`confidence`** — how complete the *extraction* is. Computed by `_compute_confidence()` in `apps/ai/app/extraction.py` from a per-field weight table (e.g. on an INVOICE: `vendorName=20, totalAmount=25, ...`).

Both flow back in the callback and are surfaced separately in the UI.

---

## 4. Data model

Four entities, all in PostgreSQL, all owned by Prisma. Soft deletes are enforced everywhere a document is queried.

```mermaid
erDiagram
    USER ||--o{ DOCUMENT : owns
    USER ||--o{ AUDITLOG : "triggered"
    DOCUMENT ||--o| EXTRACTED_DATA : "has"
    DOCUMENT ||--o{ AUDITLOG : "appears in"

    USER {
        string id PK
        string email UK
        string password "bcrypt"
        string name
        string avatarPath
        Role   role "USER|ADMIN"
        bool   isActive
        datetime createdAt
        datetime updatedAt
    }

    DOCUMENT {
        string id PK
        string originalName
        string storagePath
        string mimeType
        int    size
        DocumentStatus status
        DocumentType   type
        DocumentType   detectedType "set by AI"
        float          classificationConfidence "0-100"
        string userId FK
        datetime createdAt
        datetime updatedAt
        datetime deletedAt "soft delete"
    }

    EXTRACTED_DATA {
        string  id PK
        json    payload
        float   confidence "0-100"
        json    fieldOverrides "{ field: { reason, markedBy, markedAt } }"
        string  documentId FK,UK
        datetime createdAt
        datetime updatedAt
    }

    AUDITLOG {
        string id PK
        AuditAction action
        string      description
        json        oldValue
        json        newValue
        string      userId FK "nullable"
        string      documentId FK "SetNull on delete"
        datetime    timestamp
    }
```

Notes worth keeping in mind when reading the schema in `apps/api/prisma/schema.prisma`:
- `Document.deletedAt` makes deletes recoverable and keeps the audit trail intact. Every list query filters `deletedAt IS NULL`.
- `AuditLog.documentId` is `SetNull`-on-delete so the log survives even if the document is ever hard-deleted (compliance).
- `ExtractedData.fieldOverrides` carries the per-field N/A workflow: a JSON object keyed by field name, each entry stamped with the reason, the user, and the timestamp.

---

## 5. Authentication & authorization

JWT-based, with two roles. The web app stores the token in `localStorage` and attaches it to every request via an axios interceptor; on a 401 the interceptor clears the token and bounces the user to `/login`.

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web (axios)
    participant A as API
    participant DB as Postgres

    U->>W: submit /login form
    W->>A: POST /auth/login { email, password }
    A->>DB: SELECT user WHERE email
    A->>A: bcrypt.compare(password, user.password)
    A->>A: assert user.isActive
    A->>A: sign JWT { sub, email, name, role }, expires 1h
    A-->>W: 200 { access_token }
    W->>W: localStorage.setItem('agridoc_token', token)

    alt role === 'ADMIN'
        W->>W: router.push('/admin')
    else
        W->>W: router.push('/dashboard')
    end

    loop subsequent requests
        W->>A: GET /documents  (Authorization: Bearer ...)
        alt JWT valid + not expired
            A-->>W: 200 data
        else expired / invalid
            A-->>W: 401
            W->>W: clearToken() + redirect /login
        end
    end
```

Endpoint authorization is enforced by `JwtAuthGuard` (default for every controller) plus the `@Public()` decorator for the AI-service callbacks (which are themselves guarded by the `x-api-key` shared secret). Admin-only endpoints additionally use `RolesGuard` + `@Roles(Role.ADMIN)`.

---

## 6. Notable design decisions

- **Why fire-and-forget for the AI worker?** Synchronous calls would tie up Nest workers for the duration of OCR + an LLM round-trip (often 4–8 s on a real PDF). The fire-and-forget + callback model lets BullMQ provide back-pressure and lets the worker be scaled or moved independently.
- **Why does the API tell the AI where to call back?** So the AI worker doesn't have to know the API's hostname statically. It only needs the `callbackUrl` it receives in the job. In Docker this matters: the URL inside the cluster (`http://api:3000`) is different from `http://localhost:3000` outside it.
- **Why two confidence numbers?** A document can be confidently classified as `INVOICE` but have a half-empty extraction (e.g. the bottom of the page was cut off in the scan). Surfacing both lets the reviewer tell *which* part the model was unsure about.
- **Why soft delete?** Audit logs reference documents. We need them queryable forever, even after the user "deletes" a document, for compliance.
- **Why HITL is never bypassed.** Even when the AI is 99% confident, the reviewer is the legal owner of the data being attested. Straight-through processing was explicitly cut from scope.

---

## 7. Where to read the code

| Layer | File | Why |
|---|---|---|
| Classifier prompt | `apps/ai/app/prompts.py` (`classify_prompt`) | The first-pass document-type prompt |
| Classifier function | `apps/ai/app/extraction.py` (`classify`) | Calls the LLM, parses, returns `{type, confidence, reasoning}` |
| AI dispatch | `apps/ai/app/main.py` (`_process_and_callback`) | Wires OCR → classify-if-UNKNOWN → extract → callback |
| BullMQ worker | `apps/api/src/documents/documents.processor.ts` | NestJS-side processor, posts to `/extract` |
| Callback handler | `apps/api/src/documents/documents.service.ts` (`handleExtractionCallback`) | Persists payload + detected type, transitions status |
| Manual type override | `apps/api/src/documents/documents.service.ts` (`overrideDocumentType`) | When the user disagrees with the AI |
| HITL validation | `apps/api/src/documents/documents.service.ts` (`updateExtractedData`) | Zod validation + required-fields-or-N/A enforcement |
| Frontend detection badge | `apps/web/app/(dashboard)/documents/[id]/page.tsx` | Renders "Detected as INVOICE (94%)" + change-type modal |
