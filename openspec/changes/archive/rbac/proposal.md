## Why

Auth 流程完成後，需要精細的存取控制機制：superadmin 透過 Firebase custom claims 識別，admin/member 的 role 與 permissions 存放於 Firestore，並在每次 request 注入 context 供 API handler 使用。

## What Changes

- 建立 `server/middleware/04.rbac.ts`（注入 permissions 到 RequestContext）
- 建立 `server/modules/roles/`（roles、permissions、role_permissions CRUD）
- 建立 `server/shared/rbac.ts`（`requirePermission()` guard helper）
- 建立 RBAC 相關 API endpoints（`/api/admin/roles`、`/api/admin/permissions`、`/api/admin/role-permissions`）
- 建立 IAM 管理頁（`pages/iam/roles/index.vue`、`pages/iam/permissions/index.vue`）
- 建立 `composables/usePermission.ts`（client-side permission check）

## Capabilities

### New Capabilities

- `rbac`: Hybrid RBAC + Permission 完整實作，支援執行期動態新增 role 與 permission

## Impact

- **新增**: `server/middleware/04.rbac.ts`
- **新增**: `server/modules/roles/`（roles.types.ts、roles.schema.ts、roles.repo.ts、roles.service.ts、index.ts）
- **新增**: `server/shared/rbac.ts`
- **新增**: `server/api/admin/roles.get.ts`、`permissions.get.ts`、`role-permissions.get.ts`、`role-permissions.patch.ts`
- **新增**: `pages/iam/roles/index.vue`、`pages/iam/permissions/index.vue`
- **新增**: `composables/usePermission.ts`
- **依賴**: 無新增外部套件
