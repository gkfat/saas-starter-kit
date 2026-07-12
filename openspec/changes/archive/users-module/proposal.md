## Why

RBAC 完成後，需要建立使用者管理功能，供 admin 查看與管理 tenant 內的使用者，並為後續 audit_log 寫入提供基礎。

## What Changes

- 建立 `server/modules/users/`（users CRUD service/repo）
- 建立 users 管理 API（`/api/admin/users`）
- 建立使用者列表頁（`pages/users/index.vue`）
- audit_log 寫入為 pending（Phase 5 logging module 完成後補齊）

## Capabilities

### New Capabilities

- `users-module`: Users 讀取、建立、更新、刪除，含 role 指派

## Impact

- **新增**: `server/modules/users/`（users.types.ts、users.schema.ts、users.repo.ts、users.service.ts、index.ts）
- **新增**: `server/api/admin/users.get.ts`
- **新增**: `pages/users/index.vue`
- **Pending**: audit_log 寫入（users create/update/delete — 待 Phase 5 補齊）
- **依賴**: 無新增外部套件
