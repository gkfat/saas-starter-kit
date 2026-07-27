## Why

目前首頁（`/`）只是單純轉導：已登入導向 `/dashboard`，未登入則被 `middleware/auth.global.ts` 攔截導向 `/login`，訪客沒有任何機會了解這套會員系統的特色或方案，也沒有一個公開的版本異動紀錄可查閱。需要新增三個公開頁面（會員系統特色、方案、版本紀錄），並讓未登入訪客有一個真正的行銷入口頁，同時提供登入按鈕導向登入頁。

## What Changes

- 首頁（`/`）改為純轉導頁：已登入使用者依權限導向 `/dashboard`（無 `Dashboard.Read` 權限則導向 `/profile`）；未登入訪客導向 `/home`
- 新增行銷首頁 `/home`，內容包含前往「會員系統特色」「方案」「版本紀錄」三個頁面的進入點卡片，以及一個導向 `/login` 的登入按鈕
- 新增三個公開頁面：`/features`（會員系統特色）、`/pricing`（方案）、`/changelog`（版本異動紀錄，內容取自既有 `CHANGELOG.md`）
- `/home`、`/features`、`/pricing`、`/changelog` 這四個頁面皆可直接瀏覽（含未登入狀態），不會被路由守衛導向 `/login`；已登入使用者也能正常瀏覽（不因為是「公開頁面」而被排除）
- 沿用現有 App 版面（含 `AppDrawer`），在 `AppDrawer` 底部會員區塊新增這三個公開頁面的連結；未登入時，該區塊原本顯示的頭像/租戶名稱/登出按鈕改為顯示一個「登入」按鈕，其餘依權限顯示的導覽項目（Dashboard、Profile、Admin 相關）在未登入時不顯示
- `AppDrawer` 頂部的專案 logo 區塊新增點擊行為，導向 `/`（實際落地頁由 `/` 的轉導邏輯決定）

## Capabilities

### New Capabilities

- `public-marketing-pages`: 定義 `/` 的轉導規則、行銷首頁 `/home`、三個公開頁面（特色/方案/版本紀錄）、其在未登入狀態下的可存取性，以及 `AppDrawer` 依登入狀態調整導覽項目與底部區塊的行為

### Modified Capabilities

（無既有 spec 之 Requirement 區塊異動；`middleware/auth.global.ts` 的路由守衛與 `AppDrawer` 的導覽渲染邏輯有程式碼異動，但其行為規範完整定義於新能力 `public-marketing-pages`）

## Impact

- **前端頁面**：新增 `pages/marketing/home/index.vue`（行銷首頁）、`pages/marketing/features/index.vue`、`pages/marketing/pricing/index.vue`、`pages/marketing/changelog/index.vue`；`pages/index.vue` 改為純轉導頁（已登入依權限轉 `/dashboard` 或 `/profile`，未登入轉 `/home`）
- **路由守衛**：`middleware/auth.global.ts` 新增一組「公開內容路由」（`/`、`/home`、`/features`、`/pricing`、`/changelog`），不強制要求登入，且不像 `/login` 一樣在已登入時被導離
- **導覽設定**：`config/app-routes.ts` 新增 `/features`、`/pricing`、`/changelog` 三個連結項目與其顯示條件（`public: true`，不受權限限制）；`/home` 不在 `AppDrawer` 導覽清單中，僅透過首頁轉導或 logo 連結進入
- **元件**：`components/layout/AppDrawer.vue` 底部區塊（`#append`）依 `auth.isLoggedIn` 分流顯示「使用者資訊 + 登出」或「登入按鈕」；頂部 logo 區塊新增點擊導向 `/`
- **內容來源**：`/changelog` 頁面解析並顯示既有 `CHANGELOG.md` 內容，不新增獨立的資料維護流程
- **i18n**：新增行銷首頁、特色頁、方案頁、changelog 頁、登入按鈕相關文案（zh-TW/en）
