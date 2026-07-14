## Why

現有 Admin 介面使用 Vuetify 預設樣式，頂部 AppBar + 側邊 Drawer 的組合視覺層次不明確，資料密度低，與管理後台的操作需求不符。參考 Firebase Console 的設計語言，改造為 sidebar-first 的資料導向介面，提升操作效率與一致性。

## What Changes

- **移除** `AppHeader`（頂部 AppBar），sidebar 整合所有導航與使用者操作
- **重設計** `AppDrawer`：加入 project name 標題、tenant 顯示、群組導航、底部使用者資訊 + 登出按鈕、mobile 支援
- **新增** sidebar collapse/expand 切換（桌面，icon-only ↔ icon+label）
- **新增** `Breadcrumb` component：自動從路由路徑生成麵包屑，小字體
- **新增** `PageHeader` component：頁面標題
- **改造** 所有頁面（Dashboard、Profile、Users、Roles、Permissions、Logs）整合 Breadcrumb + PageHeader
- **定義** Vuetify theme color tokens：`primary: #1967D2`、`surface: #ffffff`、灰階 subtext
- **更新** `layouts/default.vue`：移除 AppHeader，加入 mobile AppBar（hamburger）
- **支援 RWD**：mobile 以 temporary overlay drawer 呈現

## Capabilities

### New Capabilities

- `admin-shell`: 仿 Firebase Console 風格的 Admin UI shell，含 sidebar、breadcrumb、RWD 支援
- `vuetify-theme`: 統一的 Vuetify theme color token 設定

### Modified Capabilities

（無現有 spec 需要異動需求層級）

## Impact

- **layouts/default.vue**: 結構調整，移除 AppHeader，加入 mobile AppBar
- **components/layout/AppDrawer.vue**: 全面重寫，含 RWD
- **components/layout/AppHeader.vue**: 廢棄
- **components/layout/PageContent.vue**: 調整 mobile padding
- **plugins/vuetify.ts**: Vuetify theme token 設定
- **pages/**: 所有頁面加入 Breadcrumb + PageHeader
- 無 API、Firestore、Auth 層異動
