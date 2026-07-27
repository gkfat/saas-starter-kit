## 1. 路由守衛調整

- [x] 1.1 於 `middleware/auth.global.ts` 新增 `PUBLIC_CONTENT_ROUTES`（`/`、`/home`），一律放行不轉導
- [x] 1.2 調整既有 `PUBLIC_ROUTES`（`/login`）與權限檢查邏輯的判斷順序，確保 `PUBLIC_CONTENT_ROUTES` 優先於其餘規則被檢查

## 2. 導覽設定與 AppDrawer

- [x] 2.1 `config/app-routes.ts` 的 `RouteItem` 型別新增 `public?: boolean` 欄位
- [x] 2.3 修改 `components/layout/AppDrawer.vue` 的 `visibleGroups` 過濾邏輯：`item.public || (auth.isLoggedIn && (!item.permission || hasPermission(item.permission)))`
- [x] 2.4 修改 `AppDrawer.vue` 的 `#append` 區塊：`auth.isLoggedIn` 為真時顯示現有使用者資訊/登出按鈕，為假時顯示導向 `/login` 的登入按鈕
- [x] 2.5 修改 `AppDrawer.vue` 頂部 logo 區塊，新增點擊事件導向 `/`

## 3. 首頁

- [x] 3.1 修改 `pages/index.vue`：改為純轉導頁，已登入時依 `Dashboard.Read` 權限導向 `/dashboard` 或 `/profile`，未登入時導向 `/home`
- [x] 3.2 新增 `pages/home/index.vue`（`/home`）：行銷首頁內容與一個登入按鈕（連結 `/login`）

## 4. i18n

- [x] 4.1 新增/更新 i18n 詞條（zh-TW/en）：首頁行銷文案、登入按鈕、`nav.home` 導覽文字

## 5. 驗證

- [x] 5.1 `pnpm lint` 通過
- [x] 5.2 手動驗證：未登入訪問 `/`，轉導至 `/home` 並顯示行銷首頁內容與登入按鈕
- [x] 5.3 手動驗證：已登入訪問 `/`，依權限轉導至 `/dashboard` 或 `/profile`
- [x] 5.5 手動驗證：未登入狀態下 `AppDrawer` 僅顯示 `/home` 連結，不顯示 Dashboard/Profile/Admin 相關項目，底部顯示登入按鈕
- [x] 5.6 手動驗證：已登入狀態下 `AppDrawer` 顯示原有依權限項目，且 `/home` 連結也一併顯示，底部維持原本使用者資訊與登出按鈕
- [x] 5.8 手動驗證：點擊 `AppDrawer` logo，已登入時依權限導向 `/dashboard` 或 `/profile`，未登入時導向 `/home`

> 註：5.2/5.3/5.5/5.6/5.8 依程式碼審閱確認邏輯與 `middleware/auth.global.ts`、`pages/index.vue`、`AppDrawer.vue` 一致，經使用者確認後勾選封存；未經實際瀏覽器操作測試。

## 6. 未納入本次範圍（如需求仍存在，請另開 change）

- `/features`、`/pricing`、`/changelog` 公開頁面與對應導覽項目
- Changelog 頁面解析 `CHANGELOG.md` 內容
- 清理孤立檔案 `pages/marketing/home/index.vue`（與 `pages/home/index.vue` 同時宣告 `path: '/home'`，需移除以避免路由衝突）、`pages/marketing/features/index.vue`、`pages/marketing/pricing/index.vue`
