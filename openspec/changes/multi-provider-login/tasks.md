## 1. Superadmin Seed Script

- [x] 1.1 建立 `scripts/seed-superadmin.ts`：載入 `.env`、初始化 Firebase Admin SDK
- [x] 1.2 實作 `getUserByEmail` 存在檢查：已存在且 claims 正確 → 輸出警告並跳過；已存在但 claims 不符 → 拋出錯誤
- [x] 1.3 實作 `createUser({ email, password })` + `setCustomUserClaims(uid, { role: 'superadmin' })` 主流程

## 2. 環境設定清理

- [x] 2.1 移除 `nuxt.config.ts` runtimeConfig 中的 `superadminEmail` / `superadminUid`
- [x] 2.2 移除 `.env.example` 中的 `SUPERADMIN_EMAIL` / `SUPERADMIN_UID`，補上 seed script 使用說明（`SUPERADMIN_EMAIL`、`SUPERADMIN_PASSWORD` 僅供 seed script 使用）

## 3. 驗證

- [x] 3.1 執行 `pnpm build`，確認 TypeScript 編譯無錯誤
- [x] 3.2 執行 `pnpm lint`，確認 ESLint 無警告
