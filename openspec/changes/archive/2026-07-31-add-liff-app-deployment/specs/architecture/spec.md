## MODIFIED Requirements

> Note for sync: the main `architecture` spec predates the Requirement/Scenario format — it
> expresses this content as freeform `## Module Directory Structure` and `## Firebase SDK Split`
> sections describing the pre-monorepo single-Nuxt-app layout (`server/modules/...`, root-level
> `utils/firebase-client.ts`, `server/shared/firebase-admin.ts`). Those two sections SHALL be
> replaced by the content below — they describe a directory layout that no longer exists.

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
