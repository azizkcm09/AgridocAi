# AgridocAi
# AgriDoc AI — Monorepo Workspace Organization

## Overview

AgriDoc AI uses a **Monorepo architecture** to host all core services of the platform in a single repository.
This approach enables **shared domain contracts**, **strong consistency**, and **scalable collaboration**
between frontend, backend, and AI services.

The monorepo contains three main applications:
- **Web Application (Next.js)** — Experience Layer
- **API Backend (NestJS)** — Orchestration Layer
- **AI Service (Python / FastAPI)** — Intelligence Layer

---

## Monorepo Philosophy

The monorepo is designed according to the following principles:

1. **Clear separation of responsibilities** between services  
2. **Single source of truth** for domain models and enums  
3. **Contract-driven development** between frontend and backend  
4. **Zero duplication of domain types**  

Frontend and backend **never redefine the same data structures independently**.

---

## Repository Structure

```txt
agri-doc-ai/
│
├── apps/
│   ├── web/              # Next.js Frontend (Experience Layer)
│   ├── api/              # NestJS Backend (Orchestration Layer)
│   └── ai/               # Python FastAPI (Intelligence Layer)
│
├── packages/
│   └── shared/           # Shared TypeScript domain contracts
│
├── infrastructure/
│   ├── docker/           # Dockerfiles for services
│   ├── docker-compose.yml
│   └── redis/            # Redis / BullMQ configuration
│
├── docs/
│   ├── architecture/     # Architecture decisions
│   └── diagrams/         # UML, sequence, component diagrams
│
├── package.json          # Monorepo root configuration
├── pnpm-workspace.yaml   # Workspace configuration
└── README.md
Applications (/apps)
apps/web — Frontend (Next.js)
apps/web/
├── app/
├── components/
├── services/        # API communication layer
├── hooks/
├── types/           # Re-exported shared domain types
└── package.json
Responsibilities
User interface (document upload, validation dashboard)

API consumption

Client-side state management

Display of extracted data

No business logic

Uses shared domain contracts from @agri-doc/shared

apps/api — Backend (NestJS)
apps/api/
├── src/
│   ├── documents/    # Document lifecycle management
│   ├── audit/        # Audit logs & traceability
│   ├── auth/         # Authentication & RBAC
│   ├── queue/        # Redis / BullMQ jobs
│   └── main.ts
├── prisma/           # Database schema & migrations
└── package.json
Responsibilities
Business logic orchestration

Role-Based Access Control (RBAC)

Background job scheduling (Redis / BullMQ)

Database transactions (PostgreSQL)

AI service coordination

Contract enforcement using shared domain types

apps/ai — AI Service (Python / FastAPI)
apps/ai/
├── app/
│   ├── preprocessing/   # Image cleanup & enhancement
│   ├── ocr/             # OCR extraction logic
│   ├── llm/             # LLM-based structured parsing
│   └── main.py
├── requirements.txt
Responsibilities
Image preprocessing (deskewing, denoising)

OCR text extraction

LLM-based JSON structuring

Asynchronous communication with backend

No direct database access

Shared Package (/packages/shared) ⭐
Purpose
The shared package is the cornerstone of the monorepo.

It contains TypeScript interfaces, DTOs, and enums used by:

Frontend (Next.js)

Backend (NestJS)

This enforces a single source of truth for all domain contracts.

Structure
packages/shared/
├── src/
│   ├── document.types.ts
│   ├── extracted-data.types.ts
│   ├── audit-log.types.ts
│   ├── enums.ts
│   └── index.ts
├── package.json
└── tsconfig.json
Example: document.types.ts
import { DocumentStatus } from './enums';

export interface DocumentDTO {
  id: string;
  status: DocumentStatus;
  documentType: 'INVOICE' | 'CERTIFICATE';
  createdAt: string;
}
Example: enums.ts
export enum DocumentStatus {
  PENDING = 'PENDING',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  VALIDATED = 'VALIDATED',
}
Shared Types Usage
Frontend (Next.js)
import { DocumentDTO } from '@agri-doc/shared';
Backend (NestJS)
import { DocumentDTO, DocumentStatus } from '@agri-doc/shared';
✔ Same interfaces
✔ Same enums
✔ Compile-time validation
✔ No runtime contract mismatch

How This Prevents Code Duplication
Without Shared Contracts ❌
Frontend defines its own models

Backend defines separate DTOs

Types drift over time

Breaking changes appear at runtime

Increased maintenance cost

With /packages/shared ✅
One definition per domain concept

Compile-time safety across applications

No duplicated interfaces

Faster refactoring

Strong contract-driven architecture

Any change to domain models is automatically propagated to all consumers.
