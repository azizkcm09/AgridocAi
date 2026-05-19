# `apps/api` — NestJS Backend

The orchestration layer. Owns authentication, the document lifecycle, the queue, the audit trail, and every read from PostgreSQL. The frontend talks to this app, never directly to the AI worker.

## Modules

| Module | Path | What it owns |
|---|---|---|
| `AuthModule` | `src/auth/` | JWT login/register, bcrypt hashing, `JwtAuthGuard`, `RolesGuard`, `@Public()` decorator, `@Roles()` decorator |
| `UsersModule` | `src/users/` | Profile, avatar upload, password change, activity stats |
| `DocumentsModule` | `src/documents/` | Full CRUD, soft delete, HITL validation, batch ops, AI callbacks, PDF export |
| `StorageModule` | `src/storage/` | MinIO presigned URLs for upload + download |
| `AuditModule` | `src/audit/` | Append-only log of every user/AI action with old/new values |
| `AdminModule` | `src/admin/` | Platform-wide user/document/audit queries + analytics |
| `CacheModule` | `src/cache/` | Redis cache wrapper (used by stats + analytics) |
| `PrismaModule` | `src/prisma/` | Prisma client lifecycle |

## Environment variables

| Key | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_SECRET` | yes | HMAC secret used by `JwtStrategy` |
| `AI_SERVICE_URL` | yes | Base URL of the FastAPI worker, e.g. `http://localhost:8000` |
| `AI_CALLBACK_SECRET` | yes | Shared secret. The AI service sends it back as `x-api-key`; the API rejects callbacks without it |
| `API_BASE_URL` | yes | Used to compose the `callbackUrl` sent to the AI worker |
| `FRONTEND_URL` | yes | CORS origin |
| `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_BUCKET` | yes | MinIO connection |
| `REDIS_HOST` / `REDIS_PORT` | yes | BullMQ |

## Running locally

```bash
pnpm --filter api prisma generate
pnpm --filter api prisma migrate deploy   # apply existing migrations
pnpm --filter api dev                      # runs on :3000
```

Swagger docs are at <http://localhost:3000/api>.

## Running tests

```bash
pnpm --filter api test
pnpm --filter api test:e2e
```

Unit specs live next to the files they cover (`*.spec.ts`).

## Prisma cheatsheet

```bash
# After editing prisma/schema.prisma:
pnpm --filter api prisma migrate dev --name <short_description>

# Regenerate the client without touching the DB:
pnpm --filter api prisma generate

# Open Prisma Studio (read-only UI on the DB):
pnpm --filter api prisma studio
```

## The AI extraction pipeline (API side)

1. `POST /documents` → `DocumentsService.createDocument` inserts with `status=PENDING`, logs `UPLOAD`, enqueues `extract-data` on the `document-processing` BullMQ queue.
2. `DocumentsProcessor.process` (`documents.processor.ts`) picks up the job, updates `status=PROCESSING`, then POSTs `{ storagePath, documentType, callbackUrl }` to `${AI_SERVICE_URL}/extract`. Fire-and-forget — it does not await the extraction itself.
3. The Python worker calls back to `POST /documents/:id/extraction-callback` with an `x-api-key` header. `DocumentsService.handleExtractionCallback` persists the payload, adopts the AI's `detectedType` when the user uploaded as `UNKNOWN`, transitions to `REVIEW_REQUIRED`, and writes an `AUTO_EXTRACT` audit entry.
4. If the worker fails it calls `POST /documents/:id/extraction-error`, which transitions the document to `ERROR` and logs the failure.

## Notable endpoints

| Verb | Path | What |
|---|---|---|
| `POST` | `/auth/login`, `/auth/register` | Auth |
| `POST` | `/storage/presigned-url` | Get a 5-minute MinIO upload URL |
| `GET` | `/storage/download-url?key=...` | Presigned download URL for the file in the document detail viewer |
| `POST` | `/documents` | Save metadata after MinIO upload + enqueue extraction |
| `GET` | `/documents?page=&limit=&type=&status=&search=` | Paginated + filtered list |
| `GET` | `/documents/analytics` | Dashboard charts + KPIs (60s cache) |
| `GET` | `/documents/stats` | Dashboard tiles (30s cache) |
| `GET` | `/documents/:id` | Document + extractedData + auditLogs |
| `PATCH` | `/documents/:id/data` | HITL validation — Zod-checks the payload, enforces required-or-N/A, sets `status=VALIDATED` |
| `PATCH` | `/documents/:id/field-override` | Mark a field as N/A with a reason |
| `DELETE` | `/documents/:id/field-override/:fieldKey` | Remove an N/A override |
| `PATCH` | `/documents/:id/type` | Override the AI's detected type and reset the payload |
| `PATCH` | `/documents/:id/reject` | Set `status=REJECTED` with optional reason |
| `DELETE` | `/documents/:id` | Soft delete (sets `deletedAt`) |
| `POST` | `/documents/batch/{validate,reject,delete,export}` | Bulk operations |
| `GET` | `/documents/:id/export` | Per-document PDF export |
| `POST` | `/documents/:id/extraction-callback` | AI service callback (guarded by `x-api-key`, marked `@Public()` for JWT) |
| `POST` | `/documents/:id/extraction-error` | AI service error callback |
| `GET` | `/health` | Health probe — DB + Redis + AI service reachability |

A complete list (with request/response shapes) is in Swagger.

## Common pitfalls

- **Migration drift.** If `prisma migrate deploy` complains, run `pnpm --filter api prisma migrate resolve --applied <migration_name>` carefully — never `migrate reset` against a real DB.
- **CORS errors from the web app.** Check `FRONTEND_URL` matches the Next.js dev port (`3001` in this repo).
- **`AI_CALLBACK_SECRET` mismatch.** The API will return 401 to the worker. Confirm both `.env` files share the same value.
- **Stuck `PROCESSING` documents.** If the AI worker crashes mid-job, the API has no built-in watcher today. Fix manually (`UPDATE Document SET status='ERROR'...`); a stuck-doc watcher is on the future-work list.
