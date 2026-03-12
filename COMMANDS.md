# AgriDoc AI — Dev Commands

## Start everything (4 terminals)

### Terminal 1 — Infrastructure (Postgres, MinIO, Redis)
```bash
docker compose up -d
```

### Terminal 2 — AI Service (FastAPI, port 8000)
```bash
pnpm ai:dev
```

### Terminal 3 — Backend API (NestJS, port 3000)
```bash
cd apps/api && pnpm start:dev
```

### Terminal 4 — Frontend (Next.js, port 3001)
```bash
cd apps/web && pnpm dev
```

## URLs
| Service       | URL                          |
|---------------|------------------------------|
| Frontend      | http://localhost:3001         |
| API           | http://localhost:3000         |
| Swagger Docs  | http://localhost:3000/api     |
| AI Service    | http://localhost:8000         |
| MinIO Console | http://localhost:9001         |

## Useful one-off commands

```bash
# Stop all Docker containers
docker compose down

# Regenerate Prisma client after schema changes
cd apps/api && npx prisma generate

# Run a new Prisma migration
cd apps/api && npx prisma migrate dev --name migration_name

# Reinstall AI service dependencies
cd apps/ai && source .venv/bin/activate && pip install -r requirements.txt
```
