## Context

Users 資料存在 Firestore `tenants/{tenantId}/users/{userId}`，與 Firebase Auth 帳號分離。
建立/刪除 user 需同步操作 Firebase Auth（Admin SDK）與 Firestore，role 指派透過 `user_roles` collection。

## Goals / Non-Goals

**Goals:**

- Users 列表查詢（GET）含 role 資訊
- Users CRUD API（需 `users:read` / `users:write` permission）
- 使用者列表頁

**Non-Goals:**

- 使用者自行註冊（由 Firebase Auth 處理）
- Bulk import / export
- audit_log 寫入（Phase 5 補齊）

## Decisions

### 1. Users repo 不直接呼叫 Firebase Auth

`users.repo.ts` 只操作 Firestore `users` collection。
Firebase Auth Admin SDK 操作（如停用帳號）放在 `users.service.ts`，保持 repo 純 Firestore。

### 2. 取得 user role 的方式

Users 列表查詢時，join `user_roles` collection 取得每個 user 的 role。
由 `roles.repo.ts` 提供 `getUserRole()` 方法，`users.service.ts` 呼叫組合結果。

### 3. audit_log 寫入延後

logging module（Phase 5）尚未建立，audit_log 寫入作為 pending 項目，待 `logsService` 可用後補齊。
不在 users.service.ts 中直接操作 Firestore log collections（遵守架構規範）。

## Risks / Trade-offs

- [audit_log pending] create/update/delete 操作暫無稽核紀錄 → Phase 5 補齊後解決
- [user + user_roles join] Firestore 不支援 native join → 需在 service layer 手動組合，N+1 問題在展示用途可接受

## Migration Plan

N/A — 新功能實作。
