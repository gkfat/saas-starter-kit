## 1. logs module 骨架

- [ ] 1.1 建立 `server/modules/logs/logs.types.ts`：定義 `BaseLog`、`AuditLog`、`LoginLog` TypeScript types
- [ ] 1.2 建立 `server/modules/logs/logs.schema.ts`：Zod schema（`BaseLogSchema`、`AuditLogSchema`、`LoginLogSchema`）
- [ ] 1.3 建立 `server/modules/logs/logs.repo.ts`：`writeAuditLog()`、`writeLoginLog()` Firestore 寫入
- [ ] 1.4 建立 `server/modules/logs/logs.service.ts`：包裝 repo，fire-and-forget 錯誤處理
- [ ] 1.5 建立 `server/modules/logs/index.ts`：公開 `logsService`

## 2. 補齊 auth login_log

- [ ] 2.1 確認現有 `auth.service.ts` login_log 格式是否符合 `LoginLogSchema`
- [ ] 2.2 將 `auth.service.ts` login_log 寫入改為呼叫 `logsService.writeLoginLog()`
- [ ] 2.3 移除 auth.service.ts 中直接操作 Firestore log collections 的程式碼

## 3. 補齊 users audit_log

- [ ] 3.1 在 `users.service.ts` create user 後寫入 audit_log（action: 'user.create'）
- [ ] 3.2 在 `users.service.ts` update user 後寫入 audit_log（action: 'user.update'，含 diff）
- [ ] 3.3 在 `users.service.ts` delete user 後寫入 audit_log（action: 'user.delete'）

## 4. 驗證 API log 格式

- [ ] 4.1 確認 `server/middleware/02.logging.ts` 輸出包含 `severity`、`message`、`httpRequest`、`requestId`
- [ ] 4.2 若格式不符 GCP Structured Logging，補齊缺少欄位
