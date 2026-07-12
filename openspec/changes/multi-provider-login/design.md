## Context

`nuxt.config.ts` runtimeConfig 宣告了 `superadminEmail` / `superadminUid`，但 server 程式碼完全未使用這兩個欄位。Superadmin 身份辨識透過 Firebase Auth custom claims（`role: 'superadmin'`）在 `auth.service.verifyIdToken` 中完成，與 Firestore 無關。

目前沒有標準化的 superadmin 建立流程，需要手動到 Firebase Console 操作。本 change 新增 seed script 解決此問題。

## Goals / Non-Goals

**Goals:**

- 提供 seed script（`scripts/seed-superadmin.ts`）透過 Firebase Admin SDK 建立 superadmin 帳號
- 每 tenant 限一組 superadmin，script 執行須具備冪等性
- Superadmin 身份僅存於 Firebase Auth custom claims，不寫入 Firestore
- 移除 runtimeConfig 中未使用的 `superadminEmail` / `superadminUid`

**Non-Goals:**

- 新增或修改任何登入方式（Email/Password + Google 維持現狀）
- 多組 superadmin 帳號
- Superadmin 帳號管理 UI
- `LoginProvider` type 修改

## Decisions

**Decision 1：Seed script 使用 Firebase Admin SDK，single-superadmin 透過 `getUserByEmail` 檢查**

Seed script（`scripts/seed-superadmin.ts`）直接呼叫 Admin SDK：

1. 以 `getUserByEmail(email)` 檢查帳號是否已存在
2. 若不存在：`createUser({ email, password })` → `setCustomUserClaims(uid, { role: 'superadmin' })`
3. 若已存在且 claims 已含 `role: 'superadmin'`：跳過，輸出警告（冪等）
4. 若已存在但 claims 不符：拋出錯誤，不覆蓋現有帳號

Email / password 從環境變數讀取（`SUPERADMIN_EMAIL`、`SUPERADMIN_PASSWORD`），**不寫入 Firestore**。

**Decision 2：移除 nuxt.config.ts 的 superadminEmail / superadminUid**

這兩個欄位在 runtimeConfig 宣告但無任何 server 程式碼使用，本次一併清除。`.env.example` 同步移除對應欄位，改以 seed script 的使用說明替代（`SUPERADMIN_EMAIL`、`SUPERADMIN_PASSWORD` 僅供 seed script 使用，不進入 runtimeConfig）。

## Risks / Trade-offs

- **Seed script Admin SDK 憑證必要** → script 在 Node.js 環境直接執行，需要 `FIREBASE_PROJECT_ID`、`FIREBASE_CLIENT_EMAIL`、`FIREBASE_PRIVATE_KEY`；缺少任一會在 Admin SDK 初始化時失敗。
- **Idempotency** → 重複執行 seed script 不得建立第二組 superadmin；`getUserByEmail` 檢查確保冪等性。
- **移除 runtimeConfig 欄位為 breaking change（相對輕微）** → 若有未被 grep 到的使用點（如測試、腳本），移除後會在 TypeScript 編譯階段報錯，屬可接受的顯性錯誤。
