## Why

目前帳號結構以 Firebase Auth UID 為主、email 為必填，缺乏彈性。需要改為以帳號（username）為主識別、email 與手機號碼均為選填綁定，並支援 Google Provider 作為附加登入方式。

## What Changes

- 帳號 ID 改為字串（username），格式：6–8 碼英數字，不含特殊符號
- 密碼格式：6–8 碼英數字
- Email 為選填綁定欄位（非必要）
- 手機號碼為選填綁定欄位（非必要）
- **BREAKING**：登入方式從 email/password 改為 username/password（帳號密碼）
- Google Login 作為附加 Provider，可綁定至帳號；登入流程綁定時 Google email 必須與帳號已綁定的 email 相同
- 以 Google 繼續但帳號不存在 → 自動進入 Google 帳號快速註冊流程
- Profile 頁面新增主動綁定 Google Provider 流程（`linkWithPopup`），不檢查/不覆蓋既有 email 欄位
- 調整 seed-demo-users 以符合新帳號結構
- **BREAKING**：`users` collection schema 新增 `username` 欄位，`email` 改為選填

## Capabilities

### New Capabilities

- `account-username-auth`: 以 username + password 作為主要登入方式，帳號 6–8 英數字，密碼 6–8 英數字
- `account-provider-binding`: 帳號可綁定 Google Provider（email 須一致）；可選填綁定 email、手機號碼

### Modified Capabilities

- `auth`: 登入 provider 從 email/password 改為 username/password；Google 登入行為改為 Google 帳號快速註冊/登入
- `user-registration`: 新增 username 欄位；email 改選填；Google 繼續流程新增帳號不存在時自動帶入 Google 資訊進行快速註冊
- `data`: `users` schema 新增 `username`（必填）、`email` 改為選填、`phone` 選填、`providers` 陣列記錄已綁定 provider

## Impact

- `server/modules/auth/`: 登入驗證邏輯需支援 username lookup
- `server/modules/users/`: user schema 調整，新增 username 唯一性驗證
- `composables/useAuth.ts`: 登入改用 username 查詢對應 Firebase Auth 帳號
- `pages/login.vue`, `pages/auth/register.vue`: UI 欄位調整
- `server/scripts/seed-demo-users.ts`（或類似路徑）: 更新 demo user 資料結構
- Firestore `users` collection: 新增 `username` index，確保唯一性
