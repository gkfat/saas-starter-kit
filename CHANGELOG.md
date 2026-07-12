# Changelog

## [Unreleased]

### Added

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
