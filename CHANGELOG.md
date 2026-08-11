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
- 實作 Toast 元件與 API error handler
- 實作 i18n 多語系
- 導入 dayjs 做時間轉換
- 實作註冊、登入限流
- 實作 featureFlag 機制
- 管理端新增建立使用者功能，含一次性密碼設定連結（`/auth/set-password`）
- 使用者列表新增伺服器端查詢、匯出 CSV、帳號狀態（已啟用／已停用／尚未變更預設密碼）與最近登入時間欄位
- 管理端新增停用/啟用使用者、重新產生密碼設定連結、刪除已停用使用者操作
- 新增 RBAC 權限 `users:create`、`users:delete`
- 實作篩選器樣式
- 實作儀表板
- 實作時區功能
- 實作產品介紹頁面
- 實作驗證過期 dialog 與登出機制
- 新增 Liff infra
- 實作 Liff & 後台串接 Line 登入，新增變更密碼功能
- 實作 API tracing log
- 實作會員等級 feature
- 實作優惠券 feature
- 實作會員點數 feature
- 實作活動 feature

### Changed

- firestore 區分 dev, prod 前綴
- 調整 UI layout
- 調整權限結構與共用 enum
- 調整帳號結構，改為以 username + password 作為主要登入 provider
- 優化個人資料頁面 UI
- 移除多租戶（tenant）資料結構，改為單一租戶架構
- 角色管理頁面與角色指派下拉選單不再顯示 superadmin
- 將專案拆分為 monorepo 結構
