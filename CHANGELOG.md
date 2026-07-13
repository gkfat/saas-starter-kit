# Changelog

## [Unreleased]

### Added

- 新增使用者自助註冊功能：以 email/password 建立帳號，成功後導向登入頁
- 登入頁與註冊頁互相補上導覽連結
- 新增 `scripts/seed-superadmin.ts`：透過 Firebase Admin SDK 建立 superadmin 帳號（email + password + custom claims `{ role: 'superadmin' }`），具備冪等保護，不寫入 Firestore
- 新增 `pnpm seed:rbac` 與 `pnpm seed:superadmin` npm scripts，安裝 `tsx` devDependency
- 實作 RBAC 權限系統：定義 Role、Permission、role_permissions、user_roles Firestore collections，並完成 server-side 授權驗證
- 實作 Users、Roles、Permissions 管理 API，支援列表查詢
- 新增 Users、Roles、Permissions 管理頁面
- 實作完整的 Authentication 流程，含 Email/Password、Google 登入，以及手機 OTP 驗證（整合至 Profile 頁面）
- 新增 Admin layout 框架與 Dashboard 頁面
- 新增 Firestore 連線驗證（life check）
- 初始化 Nuxt 3 + Vuetify 專案，設定 SPA 模式（`ssr: false`）
- 整合 Firebase Admin SDK（server）與 Firebase Client SDK（browser）
- 設定 Pinia 狀態管理
- 新增 dotenv 環境變數管理
- 設定 Husky + lint-staged pre-commit hook
- 修正 API handler 與頁面 redirect 邏輯
- 導入 openspec
- 實作 Audit Logs 查詢

### Changed

- `nuxt.config.ts` runtimeConfig 移除未使用的 `superadminEmail` / `superadminUid` 欄位
- `.env.example` 移除 `SUPERADMIN_UID`，`SUPERADMIN_EMAIL` 改為僅供 seed script 使用，新增 `SUPERADMIN_PASSWORD`
- firestore 區分 dev, prod 前綴
