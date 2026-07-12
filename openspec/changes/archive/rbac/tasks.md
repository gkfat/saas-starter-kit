## 1. RBAC Middleware

- [x] 1.1 建立 `server/middleware/04.rbac.ts`：從 Firestore 查 user_roles → role_permissions，注入 permissions 到 RequestContext
- [x] 1.2 superadmin short-circuit：custom claims `{ role: 'superadmin' }` 時跳過 Firestore lookup

## 2. Roles Module（Server）

- [x] 2.1 建立 `server/modules/roles/roles.types.ts`（Role、Permission、RolePermission types）
- [x] 2.2 建立 `server/modules/roles/roles.schema.ts`（Zod schema）
- [x] 2.3 建立 `server/modules/roles/roles.repo.ts`：CRUD for roles、permissions、role_permissions、user_roles
- [x] 2.4 建立 `server/modules/roles/roles.service.ts`：business logic（getRoles、getPermissions、updateRolePermissions）
- [x] 2.5 建立 `server/modules/roles/index.ts`：公開 `rolesService`

## 3. RBAC Shared Helper

- [x] 3.1 建立 `server/shared/rbac.ts`：`requirePermission(ctx, permission)` — 403 guard

## 4. API Endpoints

- [x] 4.1 建立 `server/api/admin/roles.get.ts`：列出所有 roles（需 `admin:access`）
- [x] 4.2 建立 `server/api/admin/permissions.get.ts`：列出所有 permissions（需 `admin:access`）
- [x] 4.3 建立 `server/api/admin/role-permissions.get.ts`：查詢 role 對應 permissions（需 `admin:access`）
- [x] 4.4 建立 `server/api/admin/role-permissions.patch.ts`：更新 role permissions（需 `admin:access`）

## 5. IAM Pages

- [x] 5.1 建立 `pages/iam/roles/index.vue`：roles 列表 + 各 role 的 permissions 設定
- [x] 5.2 建立 `pages/iam/permissions/index.vue`：permissions 列表

## 6. Client Permission Check

- [x] 6.1 建立 `composables/usePermission.ts`：從 auth store 讀取 permissions，提供 `hasPermission()` / `isSuperadmin` helpers
