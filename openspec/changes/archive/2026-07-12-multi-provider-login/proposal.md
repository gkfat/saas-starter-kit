## Why

目前 `nuxt.config.ts` runtimeConfig 宣告了 `superadminEmail` / `superadminUid` 兩個欄位，但沒有任何 server 程式碼使用它們；superadmin 身份辨識完全依賴 Firebase Auth custom claims，不需要額外儲存。同時缺少建立 superadmin 帳號的標準流程，目前只能手動操作 Firebase Console。本 change 新增 seed script 解決此問題，並清除無用的 runtimeConfig 欄位。

登入方式維持現狀（Email/Password + Google），不新增其他 provider。

## What Changes

- 新增 seed script（`scripts/seed-superadmin.ts`），透過 Firebase Admin SDK 建立 superadmin 帳號（email + password + custom claims `{ role: 'superadmin' }`），每 tenant 限一組，不寫入 Firestore
- 移除 `nuxt.config.ts` runtimeConfig 中未使用的 `superadminEmail` / `superadminUid`
- 移除 `.env.example` 中的 `SUPERADMIN_EMAIL` / `SUPERADMIN_UID`，補上 seed script 使用說明

## Capabilities

### New Capabilities

- `superadmin-seed`: 透過 seed script 以 Firebase Admin SDK 建立 superadmin 帳號，限每 tenant 一組，不依賴 Firestore 儲存身份

### Modified Capabilities

（無）

## Impact

- `scripts/seed-superadmin.ts` — 新增 seed script（使用 Firebase Admin SDK，讀取 `.env`）
- `nuxt.config.ts` — 移除 `superadminEmail` / `superadminUid` runtimeConfig
- `.env.example` — 移除 `SUPERADMIN_EMAIL` / `SUPERADMIN_UID`；新增 seed script 使用說明
- 不影響登入流程、`LoginProvider` type、`useAuth.ts`、login page
