## 1. 建立 helper

- [ ] 1.1 新增 `server/shared/firestore-prefix.ts`，實作 `getCollectionPrefix()` 與 `prefixCollection(name: string)` 函式

## 2. 修改 repo 層

- [ ] 2.1 修改 `server/modules/users/users.repo.ts`：在 `userRef` 與 `usersCollection` 兩個 private helpers 內套用 `prefixCollection('users')`，exported functions 不需改動
- [ ] 2.2 修改 `server/modules/roles/roles.repo.ts`：在 `rolesCollection`、`permissionsCollection`、`rolePermissionsRef`、`userRolesRef`、`userRolesCollection` 五個 private helpers 內套用對應 `prefixCollection()`；`listAllRolePermissions` 直接內嵌路徑需補 private helper 後統一處理
- [ ] 2.3 修改 `server/modules/logs/logs.repo.ts`：先抽出 `loginLogsCollection(tenantId)` 與 `auditLogsCollection(tenantId)` private helpers，再套用 `prefixCollection()`，exported functions 不需改動

## 3. 修改 seed script

- [ ] 3.1 修改 `scripts/seed-rbac.ts`，將 `base` 路徑改用 `prefixCollection()`

## 4. 環境變數

- [ ] 4.1 在 `.env.example` 新增 `APP_ENV=development` 並附上說明（正式站設為 `production`）
