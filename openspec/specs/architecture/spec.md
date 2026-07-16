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

| Rule                               | Detail                                                        |
| ---------------------------------- | ------------------------------------------------------------- |
| No cross-module service import     | Use the other module's `index.ts` public interface            |
| `api/` is thin                     | handler = parse → call service → return                       |
| `shared/` has no module dependency | Pure utilities and infra, no business logic                   |
| `logs` may reference `users` types | `audit_logs` / `login_logs` are user-bound                    |
| Firebase SDK in `shared/`          | `firebase-admin.ts` (server) / `firebase-client.ts` (browser) |

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

## Firebase SDK Split

| File                              | Where used   | SDK                          |
| --------------------------------- | ------------ | ---------------------------- |
| `server/shared/firebase-admin.ts` | Server only  | Admin SDK (`firebase-admin`) |
| `utils/firebase-client.ts`        | Browser only | Client SDK (`firebase`)      |

`server/shared/` is **not** auto-imported by Nuxt — always use explicit imports there.

## Module Directory Structure

```
server/
├── modules/
│   ├── auth/     { index.ts, service.ts, schema.ts, types.ts }
│   ├── users/    { index.ts, service.ts, repo.ts, schema.ts, types.ts }
│   ├── roles/    { index.ts, service.ts, repo.ts, schema.ts, types.ts }
│   └── logs/     { index.ts, service.ts, repo.ts, schema.ts, types.ts }
├── api/          # Route handlers (thin layer)
│   ├── auth/
│   ├── users/
│   ├── admin/
│   ├── roles/
│   └── logs/
└── shared/
    ├── firebase-admin.ts
    ├── firebase-client.ts
    ├── middleware/
    └── utils/
```

## Middleware Execution Order

| File            | Role                                                           |
| --------------- | -------------------------------------------------------------- |
| `01.tracing.ts` | Generate `requestId`, inject into context                      |
| `02.logging.ts` | Record API log in GCP Structured Logging format                |
| `03.auth.ts`    | Verify Firebase ID Token, inject `userId`/`role`/`permissions` |
