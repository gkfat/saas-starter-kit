## 1. Vuetify Theme Token

- [x] 1.1 在 `plugins/vuetify.ts` 設定 `themes.light.colors.primary: '#1967D2'`
- [x] 1.2 確認 surface、background 顏色為白色（`#ffffff`），移除灰底設定（若有）

## 2. Sidebar 重設計（AppDrawer）

- [x] 2.1 在 `AppDrawer.vue` 頂部加入 project name（"saas-starter-kit"）與 tenant 顯示區塊
- [x] 2.2 新增 `useSidebarState` composable，管理 rail/expanded 狀態並持久化至 `localStorage`
- [x] 2.3 加入 toggle button（rail ↔ expanded 切換，桌面限定），移除對 `AppHeader` toggle-drawer event 的依賴
- [x] 2.4 重組導航項目為三群組：General（Dashboard、Profile）、Management（Users、Roles、Permissions）、Logs（Login Logs、Audit Logs）
- [x] 2.5 在 sidebar 底部加入 avatar、使用者資訊（displayName / email）與 Log out 按鈕
- [x] 2.6 套用 Vuetify `rail` prop 實作 icon-only 窄版模式（桌面）
- [x] 2.7 Mobile：`temporary` overlay 模式，nav item 點擊後自動關閉

## 3. Layout 調整

- [x] 3.1 移除 `layouts/default.vue` 中的 `<LayoutAppHeader />` 引用
- [x] 3.2 加入 mobile-only `v-app-bar`（hamburger + 專案名稱），傳遞 drawer open v-model
- [x] 3.3 標記 `components/layout/AppHeader.vue` 為 deprecated（檔案頂部加註，不刪除）

## 4. 新增共用 Component

- [x] 4.1 新增 `components/layout/Breadcrumb.vue`：自動從 `route.path` 生成麵包屑，小字體，最後一節不帶連結
- [x] 4.2 新增 `components/layout/PageHeader.vue`：接受 `title: string` prop，顯示頁面標題

## 5. 頁面整合

- [x] 5.1 `pages/dashboard/index.vue`：加入 Breadcrumb + PageHeader
- [x] 5.2 `pages/profile/index.vue`：加入 Breadcrumb + PageHeader
- [x] 5.3 `pages/admin/users/index.vue`：加入 Breadcrumb + PageHeader
- [x] 5.4 `pages/admin/roles/index.vue`：加入 Breadcrumb + PageHeader
- [x] 5.5 `pages/iam/permissions/index.vue`：加入 Breadcrumb + PageHeader
- [x] 5.6 `pages/admin/logs/login.vue`：加入 Breadcrumb + PageHeader
- [x] 5.7 `pages/admin/logs/audit.vue`：加入 Breadcrumb + PageHeader

## 6. Monospace 欄位樣式

- [x] 6.1 在 Users 列表 UID 欄位套用 monospace 字型
- [x] 6.2 在 Login Logs / Audit Logs 列表的 timestamp 欄位套用 monospace 字型

## 7. 驗證

- [x] 7.1 執行 `pnpm lint` 確認無 lint 錯誤
- [x] 7.2 執行 `pnpm build` 確認 TypeScript 型別與 build 通過
- [x] 7.3 啟動 `pnpm dev`，手動驗證 sidebar collapse/expand 切換正常（桌面）
- [x] 7.4 確認 mobile 下 hamburger 可開啟 drawer，導覽後自動關閉
- [x] 7.5 確認 Management / Logs 群組在 member 角色下正確隱藏
- [x] 7.6 確認所有頁面 breadcrumb 與 PageHeader 顯示正確
