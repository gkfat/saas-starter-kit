## Context

需要一個既能表達身份（role）又能精細控制操作（permission）的存取控制系統。
Superadmin 不走 Firestore，直接透過 Firebase custom claims 識別，其餘角色走 Firestore lookup。

## Goals / Non-Goals

**Goals:**

- Hybrid RBAC + Permission model
- superadmin: custom claims short-circuit，不查 Firestore
- admin / member: 從 `user_roles` 查 role → 從 `role_permissions` 查 permissions → 注入 context
- `requirePermission()` helper 供各 API handler 使用
- Roles / Permissions 管理 API 與 IAM 頁面
- 執行期可動態新增 role 與 permission（無需 schema migration）

**Non-Goals:**

- Permission inheritance / hierarchy
- Row-level security（per-resource access control）
- 前端 permission caching

## Decisions

### 1. Hybrid RBAC + Permission 評估順序

```
request → 04.rbac.ts → check role first (superadmin short-circuit)
         → query user_roles → query role_permissions
         → inject permissions[] into RequestContext
```

superadmin 不查 Firestore，直接注入 `['*']` 或 full permissions list。

### 2. Permission 格式

`resource:action`，例如 `users:read`、`users:write`、`admin:access`。
格式簡單、易讀、易擴充。

### 3. requirePermission() 設計

```ts
function requirePermission(ctx: AuthenticatedContext, permission: string): void;
```

若 context 中 permissions 不含指定 permission，throw 403。
用在 service layer，不在 middleware，保持 middleware 無業務邏輯。

### 4. Seed data

初次部署時 seed：

- Roles: `superadmin`、`admin`、`member`
- Permissions: `users:read`、`users:write`、`admin:access`
- role_permissions: `admin` → 全部；`member` → `users:read`

## Risks / Trade-offs

- [Firestore lookup per request] 每個 authenticated request 需查 2 collections → 展示用途可接受，production 可加 cache
- [superadmin via custom claims] 若 claims 被竄改，server Admin SDK verifyIdToken 仍會捕捉

## Migration Plan

N/A — 新功能實作。建議在 Phase 1 infra 完成後立即實作，避免後續 API 需回頭補 permission guard。
