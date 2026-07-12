# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # ESLint check
pnpm lint:fix     # ESLint auto-fix
pnpm format       # Prettier format
```

No test suite yet. Lint runs automatically on staged files via Husky pre-commit hook.

## Environment

Copy `.env.example` to `.env` and fill in Firebase credentials. Two separate SDK configs are required:

- **Server** (`FIREBASE_*`): Admin SDK — service account credentials
- **Browser** (`VITE_FIREBASE_*`): Client SDK — public config from Firebase console

## Architecture

**Nuxt 3, SPA mode** (`ssr: false`). No SSR hydration concerns; Firebase Client SDK runs browser-only.

### Request flow

```
pages/ → middleware/auth.global.ts (client route guard)
api/   → server/middleware/ (tracing → logging → auth) → modules/*/service → modules/*/repo → Firestore
```

### Server layer rules

- `api/` handlers are thin: parse body → call service → return response
- `modules/*/service.ts` owns business logic; never calls Firestore directly
- `modules/*/repo.ts` owns all Firestore operations; no business logic
- `shared/` has zero dependency on any module (pure infra)
- Modules expose public API only through their `index.ts`; cross-module imports must go through `index.ts`

### Firebase SDK split

| File                              | Where used   | SDK                          |
| --------------------------------- | ------------ | ---------------------------- |
| `server/shared/firebase-admin.ts` | Server only  | Admin SDK (`firebase-admin`) |
| `utils/firebase-client.ts`        | Browser only | Client SDK (`firebase`)      |

`server/shared/` is **not** auto-imported by Nuxt — always use explicit imports there.

### Auth flow

1. Browser: Firebase Client SDK handles sign-in (`composables/useAuth.ts`)
2. Browser gets `idToken` → POSTs to `/api/auth/login`
3. Server: `auth.service.verifyIdToken()` validates token via Admin SDK
4. Server injects `userId`, `tenantId`, `role`, `permissions` into `event.context`
5. Protected API routes read from `event.context` (typed as `RequestContext`)

Superadmin uses Firebase Auth custom claims `{ role: 'superadmin' }` — never stored in Firestore.

### Client route guard

`middleware/auth.global.ts` — runs on every navigation:

- Unauthenticated → redirect to `/login`
- Already logged in visiting `/login` or `/otp` → redirect to `/`

### Multi-tenant

All Firestore paths are prefixed `tenants/{tenantId}/`. The `tenantId` comes from custom claims; defaults to `'default'` when absent (Phase 3 RBAC will tighten this).

### Logging

- **API logs**: `console.log` GCP Structured Logging format — handled by `server/middleware/02.logging.ts`, never written to Firestore
- **login_logs / audit_logs**: written to Firestore via `modules/logs/` only — other modules must not write logs directly

### RequestContext type

```ts
type RequestContext = {
  requestId: string; // injected by 01.tracing.ts
  userId?: string; // injected by 03.auth.ts
  tenantId?: string;
  role?: string;
  permissions?: string[];
};
```

`AuthenticatedContext` is the narrowed `Required<RequestContext>` for routes that enforce auth.

## Implementation phases

See `docs/plan.md` for the full roadmap. Current status:

- ✅ Phase 1: Project infra
- ✅ Phase 2: Authentication (Email / Google / Phone OTP + login_logs)
- ✅ Phase 3: RBAC
- ✅ Phase 4: Users module (audit_logs 寫入待補)
- ⬜ Phase 5: Logging module (full)
- ⬜ Phase 6: Admin Dashboard
