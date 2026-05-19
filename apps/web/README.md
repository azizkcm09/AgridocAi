# `apps/web` — Next.js Frontend

The experience layer. Built on Next.js 15 with the App Router, Tailwind v4, SWR for data fetching, and a custom design system (deep botanical olive + warm ochre, Fraunces display + Geist body). All business logic lives behind the API — the frontend is pure rendering + form handling.

## App Router layout

```
app/
├── layout.tsx                  # Fonts (Geist + Fraunces) + global providers
├── globals.css                 # Design tokens — palette, typography, .card-accent
├── (auth)/                     # Public pages (login, register)
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/                # USER pages — JWT-gated, sidebar shell
│   ├── layout.tsx
│   ├── dashboard/page.tsx      # KPIs + 4 analytics charts + recent activity
│   ├── documents/
│   │   ├── page.tsx            # Paginated list with filters + batch ops
│   │   └── [id]/page.tsx       # PDF viewer + HITL form + type-override
│   ├── upload/page.tsx         # Multi-file drag-drop (no type picker)
│   ├── audit/page.tsx          # Audit log table
│   └── settings/page.tsx       # Profile, avatar, password, system health
└── (admin)/                    # ADMIN-only — different shell, dark sidebar
    └── admin/
        ├── page.tsx
        ├── documents/page.tsx
        ├── users/page.tsx
        ├── audit/page.tsx
        └── analytics/page.tsx
```

## Shared components

| Component | Purpose |
|---|---|
| `DashboardShell` | USER sidebar + topbar + mobile drawer + notifications bell |
| `AdminShell` | ADMIN sidebar (dark) + topbar + mobile drawer |
| `AuthBrandingPanel` | Left panel on `/login` and `/register` (hidden below `lg`) |
| `StatusBadge` | The single source of truth for every `DocumentStatus` pill |
| `Modal` | Reusable dialog (N/A reason, reject reason, delete confirmation, batch confirmation, type override) |
| `Breadcrumbs` | Page breadcrumbs |
| `PdfViewer` | react-pdf wrapper with zoom + page navigation |
| `EmptyState` / `ErrorState` | Inline placeholders for empty/failed list states |
| `Skeleton` family | `StatCardSkeleton`, `ChartSkeleton`, `TableRowSkeleton`, `DetailPanelSkeleton` |
| `charts/*` | Recharts wrappers (`DocumentsOverTimeChart`, `DocumentsByTypeChart`, `DocumentsByStatusChart`, `ConfidenceDistributionChart`) |

## Auth flow

Client-side only, JWT stored in `localStorage` under `agridoc_token`. The axios instance in `lib/api.ts` attaches the token to every request and clears it on a 401.

```
1.  /login form submit  →  POST /auth/login
2.  store access_token in localStorage
3.  decode role from the JWT  →  redirect to /dashboard or /admin
4.  every API call: Authorization: Bearer <token>
5.  on 401: clearToken() + window.location → /login
```

Pages inside `(dashboard)` and `(admin)` are `'use client'` components that call `isAuthenticated()` on mount and redirect if not. There is no Next middleware today — auth is enforced client-side and at the API layer.

## Data fetching

- **Reads** use [SWR](https://swr.vercel.app/). Keyed by URL, automatic revalidation, polling-while-pending on the documents list (`/documents`) and the document detail (`/documents/[id]`) every 3 seconds when a document is still `PENDING` or `PROCESSING`.
- **Mutations** use the bare axios instance from `lib/api.ts`. After a successful mutation we call `mutate()` on the relevant SWR key to refresh.

## Design system

The visual identity is described in [`app/globals.css`](app/globals.css). The short version:

- **Primary**: deep botanical olive `var(--brand)` (`#3F5640` light / `#94B091` dark).
- **Accent**: warm ochre `var(--accent)`, reserved for emphasis.
- **Surfaces**: unbleached cream paper (`#FAF7F0`) in light mode, warm charcoal (`#14150F`) in dark mode.
- **Typography**: Fraunces (variable serif) for display headings + Geist Sans for body. Wired via `next/font` in `app/layout.tsx`.
- **Signature element**: a thin brand-coloured strip at the top of auth cards via the `.card-accent` utility.

When adding a new component, reach for the CSS variables (`var(--brand)`, `var(--surface-muted)`, etc.) over hardcoded `slate-*` / `indigo-*` classes. The semantic colours (`--success`, `--warning`, `--danger`, `--info`) also have soft variants (`--*-soft`) for badges and pills.

## Environment variables

| Key | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | API base URL — defaults to `http://localhost:3000` |

The `NEXT_PUBLIC_` prefix is mandatory because we read it client-side.

## Running locally

```bash
pnpm --filter web dev      # Next.js dev server on :3001
pnpm --filter web build    # production build
pnpm --filter web start    # serve the production build
```

## Common pitfalls

- **Token in `localStorage`.** Convenient for the project scope but a real product would use httpOnly cookies. This is on the future-work list.
- **Polling-while-pending.** If the document never leaves `PROCESSING` (because the AI worker crashed), the page polls forever. The detail page should show a "this is taking longer than expected" hint after, say, 60 s — also on the future-work list.
- **Hard reload on token clear.** The interceptor uses `window.location.href = '/login'` rather than `router.push()` so the in-memory store is fully reset. Don't simplify it.
