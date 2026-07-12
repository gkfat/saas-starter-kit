## Context

目前 log 寫入分散：

- `login_logs` 在 `auth.service.ts` 直接寫入 Firestore（繞過 modules/logs/）
- `audit_logs`（users CRUD）完全未實作
- API log 走 `02.logging.ts` console.log，但格式未驗證

架構規範要求所有 Firestore log 寫入必須透過 `modules/logs/` service，其他模組不得直接操作 log collections。

## Goals / Non-Goals

**Goals:**

- 建立完整的 `modules/logs/` 模組（schema、types、repo、service、index）
- 定義 `BaseLog`、`AuditLog`、`LoginLog` Zod schema
- logs.repo.ts 實作 audit_logs 與 login_logs Firestore 寫入
- users.service.ts 補齊 create/update/delete 操作的 audit_log 寫入
- auth.service.ts login_log 改走 modules/logs/ service
- 驗證 02.logging.ts GCP Structured Logging 格式

**Non-Goals:**

- Log 查詢 API（Phase 6 Admin Dashboard 實作）
- Log retention policy / TTL
- Log export 功能

## Decisions

### 1. logs module 不依賴 users module service，只引用 users types

logs module 需要 `userId` 等 user 相關欄位，但只 import `users.types.ts`，不 import `users.service.ts`，避免循環依賴。

### 2. logs service 方法設計為 fire-and-forget，但不吞錯誤

log 寫入失敗不應中斷主流程，但錯誤需 console.error 輸出。
呼叫方式：`await logsService.writeAuditLog(...).catch(console.error)`

### 3. diff 格式統一

```ts
diff: Record<string, { before: unknown; after: unknown }>;
```

呼叫端（users.service.ts）負責比對 before/after 並組成 diff，傳入 logs service。

## Risks / Trade-offs

- [循環依賴] logs 引用 users types → 只 import types，不 import service/repo，可避免
- [auth 改動] auth.service login_log 改路徑，需確認現有 login_log 格式相容 BaseLog schema
- [fire-and-forget] log 寫入失敗靜默 → 以 console.error 補償，展示用途可接受

## Migration Plan

1. 建立 `modules/logs/` 全套檔案
2. 修改 `auth.service.ts`：login_log 改走 `logsService.writeLoginLog()`
3. 修改 `users.service.ts`：create/update/delete 補 `logsService.writeAuditLog()`
4. 驗證 `02.logging.ts` GCP Structured Logging 格式（severity、message、httpRequest、requestId）
5. 無 rollback 風險（只新增，不刪除現有邏輯）
