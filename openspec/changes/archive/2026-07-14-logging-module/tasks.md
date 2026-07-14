## 1. logs module 骨架

- [x] 1.1 建立 `server/modules/logs/logs.types.ts`：定義 `BaseLog`、`AuditLog`、`LoginLog` TypeScript types
- [x] 1.2 建立 `server/modules/logs/logs.schema.ts`：Zod schema（`BaseLogSchema`、`LoginLogSchema`）
- [x] 1.3 建立 `server/modules/logs/logs.repo.ts`：`insertLoginLog()`、`listLoginLogs()`、`listAuditLogs()` Firestore 操作
- [x] 1.4 建立 `server/modules/logs/logs.service.ts`：`recordLoginLog()` 包裝 repo
- [x] 1.5 建立 `server/modules/logs/index.ts`：公開 service 與 repo 函式

## 2. 補齊 auth login_log

- [x] 2.1 確認 `auth.service.ts` login_log 格式符合 `LoginLogSchema`
- [x] 2.2 `auth.service.ts` login_log 寫入走 `modules/logs/` service
- [x] 2.3 移除 auth.service.ts 中直接操作 Firestore log collections 的程式碼

## 3. 補齊 AuditLog 寫入鏈

- [x] 3.1 `logs.schema.ts`：新增 `AuditLogSchema`（`diff` 欄位 optional）
- [x] 3.2 `logs.repo.ts`：新增 `insertAuditLog(tenantId, log)` 函式
- [x] 3.3 `logs.service.ts`：新增 `recordAuditLog(tenantId, log)`，內部呼叫 `AuditLogSchema.parse` 後 `insertAuditLog`
- [x] 3.4 `logs/index.ts`：export `recordAuditLog`

## 4. API handler 寫入 audit_log

- [x] 4.1 `api/admin/users/[id].patch.ts`：`assignUserRole` 成功後呼叫 `recordAuditLog`，action: `user.role.assign`，metadata: `{ userId, role }`，失敗只 console.error
- [x] 4.2 `api/admin/role-permissions.patch.ts`：`updateRolePermissions` 成功後呼叫 `recordAuditLog`，action: `role.permissions.update`，metadata: `{ roleName, permissions }`，失敗只 console.error
- [x] 4.3 `api/profile/phone.patch.ts`：不寫 audit_log（電話更新屬個人操作，不納入稽核）

## 5. 驗證 API log 格式

- [x] 5.1 確認 `server/middleware/02.logging.ts` 輸出包含 `severity`、`message`、`httpRequest`、`requestId`
- [x] 5.2 若格式不符 GCP Structured Logging，補齊缺少欄位

## 6. 整體驗證

- [x] 6.1 `pnpm lint` 通過，TypeScript 無型別錯誤
- [ ] 6.2 本地執行 `pnpm dev`，手動觸發三個操作，確認 Firestore `audit_logs` collection 有資料寫入
- [ ] 6.3 確認 `admin/logs/audit` 頁面能正確顯示資料
