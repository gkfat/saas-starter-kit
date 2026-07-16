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
  diff?: Record<string, { before: unknown; after: unknown }>;
};
```

Stored in: `audit_logs/{logId}`

### login_log

```ts
type LoginLog = BaseLog & {
  type: 'login';
  provider: 'email' | 'google' | 'phone';
  ip: string;
  result: 'success' | 'failure';
};
```

Stored in: `login_logs/{logId}`

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

## Requirements

### Requirement: AuditLog type definition

`AuditLog` 的 `diff` 欄位 SHALL 為 optional（`diff?`），前端 SHALL 對 `undefined` 顯示佔位符，不強制要求呼叫端提供 before/after。

#### Scenario: diff 欄位缺席時仍可寫入

- **WHEN** `recordAuditLog` 收到不含 `diff` 的 AuditLog 資料
- **THEN** 系統 SHALL 成功寫入 Firestore，不拋出錯誤

### Requirement: audit_log 寫入點在 API handler 層

audit_log SHALL 在 API handler 操作成功後寫入，不在 service 層寫入。actor 資訊 SHALL 從 `event.context` 取得，不由呼叫端組裝傳入。

#### Scenario: actor 欄位來自 RequestContext

- **WHEN** API handler 呼叫 `recordAuditLog`
- **THEN** `actor.userId` SHALL 來自 `event.context`，`actor.role` 若為 undefined 則使用 `'unknown'`

### Requirement: 用戶角色變更寫入 audit_log

`PATCH /api/admin/users/:id`（指派角色）成功後，系統 SHALL 寫入 audit_log。

#### Scenario: 指派角色後記錄

- **WHEN** `assignUserRole` 執行成功
- **THEN** 系統 SHALL 寫入 audit_log，action: `user.role.assign`，metadata: `{ userId, role }`

### Requirement: 角色權限更新寫入 audit_log

`PATCH /api/admin/role-permissions`（更新角色權限）成功後，系統 SHALL 寫入 audit_log。

#### Scenario: 更新角色權限後記錄

- **WHEN** `updateRolePermissions` 執行成功
- **THEN** 系統 SHALL 寫入 audit_log，action: `role.permissions.update`，metadata: `{ roleName, permissions }`

### Requirement: audit_log 寫入失敗不中斷主操作

audit_log 寫入錯誤 SHALL NOT 影響 API handler 的 HTTP response。

#### Scenario: log 寫入失敗

- **WHEN** `recordAuditLog` 拋出錯誤
- **THEN** 系統 SHALL 仍回傳主操作的成功結果，並以 `console.error` 記錄錯誤
