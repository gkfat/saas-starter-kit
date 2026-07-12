# Logging Spec

## BaseLog Schema

All logs extend `BaseLog`:

```ts
type BaseLog = {
  type: 'audit' | 'login' | 'api';
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  timestamp: string; // ISO 8601
  requestId: string; // tracing
  actor: {
    userId: string;
    tenantId: string;
    role: string;
  };
  metadata: Record<string, unknown>;
};
```

## Log Types

### audit_log

```ts
type AuditLog = BaseLog & {
  type: 'audit';
  action: string; // e.g. 'user.update'
  resourceId: string;
  diff: Record<string, { before: unknown; after: unknown }>;
};
```

Stored in: `tenants/{tenantId}/audit_logs/{logId}`

### login_log

```ts
type LoginLog = BaseLog & {
  type: 'login';
  provider: 'email' | 'google' | 'phone';
  ip: string;
  result: 'success' | 'failure';
};
```

Stored in: `tenants/{tenantId}/login_logs/{logId}`

### API log

- Not stored in Firestore
- Written via `console.log` in GCP Structured Logging format
- Fields: `severity`, `message`, `httpRequest`, `requestId`
- Handled by `server/middleware/02.logging.ts`

## Storage Strategy

| Type         | Storage                    | Writer                       |
| ------------ | -------------------------- | ---------------------------- |
| `audit_logs` | Firestore                  | `modules/logs/` service only |
| `login_logs` | Firestore                  | `modules/logs/` service only |
| API log      | `console.log` (GCP format) | `02.logging.ts` middleware   |

## Module Rules

- Only `modules/logs/` may write to Firestore log collections
- Other modules (auth, users, etc.) must call `modules/logs/` service to record logs
- `logs` module may import from `users` types (user-bound logs); no circular dependency allowed
