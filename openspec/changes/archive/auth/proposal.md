## Why

實作完整的認證流程，支援 Email/Password、Google OAuth、Phone OTP 三種登入方式，並在登入時寫入 `login_log`。

## What Changes

- 實作 Firebase Client SDK 三種登入（`composables/useAuth.ts`）
- 建立 `/api/auth/login` POST endpoint（驗證 idToken，建立 server session）
- 建立 `/api/auth/logout` POST endpoint
- 建立 `server/modules/auth/`（types、schema、service）
- 實作 `middleware/auth.global.ts` client route guard
- 建立登入頁 `pages/auth/login.vue`
- Phone OTP 驗證移至 `pages/profile/index.vue`（綁定手機號碼，非登入用）
- 登入事件寫入 `login_logs`（Firestore）

## Capabilities

### New Capabilities

- `auth`: 三種登入方式（Email/Password、Google、Phone OTP）完整實作

## Impact

- **新增**: `composables/useAuth.ts`、`composables/useAuthFetch.ts`
- **新增**: `server/api/auth/login.post.ts`、`logout.post.ts`
- **新增**: `server/modules/auth/`（auth.types.ts、auth.schema.ts、auth.service.ts、index.ts）
- **新增**: `middleware/auth.global.ts`
- **新增**: `pages/auth/login.vue`、`pages/profile/index.vue`
- **依賴**: 無新增外部套件（firebase 已存在）
