# Architecture Spec

## Server Layer Rules

| Layer                  | Responsibility                                    |
| ---------------------- | ------------------------------------------------- |
| `api/` handlers        | Thin: parse body → call service → return response |
| `modules/*/service.ts` | Business logic; never calls Firestore directly    |
| `modules/*/repo.ts`    | All Firestore operations; no business logic       |
| `shared/`              | Zero dependency on any module; pure infra         |

- Modules expose public API only through `index.ts`
- Cross-module imports must go through `index.ts`
- Cross-module data transfer prefers primitives (e.g. `userId: string`)

## Module Boundary Rules

| Rule                               | Detail                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------- |
| No cross-module service import     | Use the other module's `index.ts` public interface                          |
| `api/` is thin                     | handler = parse → call service → return                                     |
| `shared/` has no module dependency | Pure utilities and infra, no business logic                                 |
| `logs` may reference `users` types | `audit_logs` / `login_logs` are user-bound                                  |
| Firebase SDK split                 | See "Firebase SDK split reflects monorepo app boundaries" requirement below |

## DTO Rules

- Every API endpoint must define a Request DTO and a Response DTO
- Use Zod schema for runtime validation, infer TypeScript type from schema
- DTO definitions live in each module's `*.schema.ts`

```ts
export const CreateUserDto = z.object({ ... })
export type CreateUserDto = z.infer<typeof CreateUserDto>
```

## RequestContext Type

```ts
type RequestContext = {
  requestId: string; // injected by 01.tracing.ts
  userId?: string; // injected by 03.auth.ts
  role?: string;
  permissions?: string[];
};

type AuthenticatedContext = Required<RequestContext>; // narrowed for protected routes
```

### Requirement: Project directory structure is a pnpm workspace monorepo

The system SHALL organize the repository as a pnpm workspace with `apps/server`, `apps/admin`, `apps/liff`, and `packages/shared`, replacing the prior single-Nuxt-app layout where `server/` and frontend directories (`pages/`, `components/`, etc.) coexisted in one project root.

```
apps/
  server/   # API: server/{api,middleware,modules,shared,utils}, standalone Nitro
  admin/    # existing SaaS frontend (pages/, components/, composables/, ...)
  liff/     # LINE LIFF frontend
packages/
  shared/   # cross-app types/constants/utils (dto/, roles.ts, permissions.ts, ...)
```

`apps/server/shared/` (server-only infra: `firebase-admin.ts`, `crypto.ts`, `rbac.ts`) remains distinct from `packages/shared` (cross-app) — the existing rule "`shared/` has zero dependency on any module" continues to apply within `apps/server`.

#### Scenario: Cross-app code lives in packages/shared

- **WHEN** code (types, constants, utilities) is used by more than one app
- **THEN** it resides in `packages/shared` and is imported by each consuming app as a workspace package dependency

#### Scenario: Server-only infra stays inside apps/server

- **WHEN** code is server-only infrastructure with zero business-module dependency (e.g. Firebase Admin SDK initialization)
- **THEN** it resides in `apps/server/shared/`, not in `packages/shared`

### Requirement: Firebase SDK split reflects monorepo app boundaries

Firebase Admin SDK usage SHALL be confined to `apps/server/server/shared/firebase-admin.ts`; Firebase Client SDK usage SHALL live inside each frontend app (`apps/admin`, `apps/liff`), not at a shared repo root — replacing the pre-monorepo paths `server/shared/firebase-admin.ts` and root-level `utils/firebase-client.ts`.

| File                                          | Where used   | SDK                          |
| --------------------------------------------- | ------------ | ---------------------------- |
| `apps/server/server/shared/firebase-admin.ts` | Server only  | Admin SDK (`firebase-admin`) |
| `apps/admin/utils/firebase-client.ts`         | Browser only | Client SDK (`firebase`)      |

#### Scenario: Admin SDK stays server-only

- **WHEN** code needs the Firebase Admin SDK
- **THEN** it imports from `apps/server/server/shared/firebase-admin.ts`, never from a frontend app

## Middleware Execution Order

| File            | Role                                                           |
| --------------- | -------------------------------------------------------------- |
| `01.tracing.ts` | Generate `requestId`, inject into context                      |
| `02.logging.ts` | Record API log in GCP Structured Logging format                |
| `03.auth.ts`    | Verify Firebase ID Token, inject `userId`/`role`/`permissions` |
