## Why

目前專案只有登入頁面，使用者無法自行建立帳號。需提供註冊頁面讓新使用者以 email/password 完成帳號建立，並在成功後自動登入。

## What Changes

- 新增 `pages/auth/register.vue`（displayName、email、password、confirm password 表單）
- 使用 Firebase Client SDK `createUserWithEmailAndPassword` 建立帳號；建立後呼叫 `updateProfile` 寫入 displayName
- 註冊成功後取得 idToken → POST `/api/auth/login`（與現有登入流程共用，自動觸發 `saveUser` upsert）
- 自動登入完成後 redirect 至 `/dashboard`
- 登入頁（`pages/auth/login.vue`）新增「前往註冊」連結

## Capabilities

### New Capabilities

- `user-registration`: 使用者以 email/password 自行建立帳號、自動登入並導向 dashboard

### Modified Capabilities

（無）

## Impact

- `pages/auth/register.vue` — 新增
- `composables/useAuth.ts` — 新增 `register(displayName, email, password)` 方法
- `pages/auth/login.vue` — 補上「前往註冊」連結
- 不新增 server API（沿用 `POST /api/auth/login` 完成 session 建立與 Firestore upsert）
