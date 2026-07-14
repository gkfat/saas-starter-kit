## Context

現有 Admin 介面由三層組成：`AppHeader`（頂部 AppBar）、`AppDrawer`（側邊 Drawer）、`PageContent`（主內容 wrapper）。AppHeader 持有 toggle drawer 按鈕與登出功能；AppDrawer 是標準 Vuetify v-navigation-drawer。兩者分離導致視覺層次不清，且頂部 bar 佔用寶貴的垂直空間。

目標：仿照 Firebase Console 的設計語言，將 sidebar 作為唯一導航容器，主內容區採 breadcrumb + 頁面標題的 data-focused 版面，並支援 RWD。

## Goals / Non-Goals

**Goals:**

- Sidebar 整合 project name、tenant context、導航群組、使用者資訊、登出
- Sidebar 支援 collapse（icon-only）/ expand（icon+label）切換（桌面）
- Mobile 支援：temporary overlay drawer + mobile AppBar（hamburger）
- 新增 `Breadcrumb` component（自動從路由生成、小字體）
- 新增 `PageHeader` component（頁面標題）
- 所有頁面整合 Breadcrumb + PageHeader
- Vuetify theme `primary: #1967D2` 統一 color token
- 移除 AppHeader，減少 layout 層次

**Non-Goals:**

- 不觸碰 API、Firestore、Auth、RBAC 邏輯
- 不實作 tenant switcher 後端邏輯（僅 UI 顯示）
- 不引入新的 CSS framework 或第三方 UI library

## Decisions

### Decision 1：移除 AppHeader，由 Sidebar 整合登出

**選擇**：廢棄 `AppHeader.vue`，登出按鈕移入 sidebar 底部使用者區塊。

**理由**：Firebase Console 無獨立 top bar，sidebar 自帶所有操作。移除 AppHeader 可消除頂部佔位，讓主內容區獲得更多垂直空間。Vuetify `v-navigation-drawer` 本身支援 absolute/fixed，不需要 app bar 協作。

**替代方案**：保留 AppHeader 但改為 slim（高度 48px）→ 捨棄，因為仍佔空間且與 Firebase Console 風格不符。

---

### Decision 2：Sidebar collapse 用 rail mode（桌面）；Mobile 用 temporary overlay

**選擇**：

- 桌面：`v-navigation-drawer` 的 `rail` prop（56px icon-only）切換，`useSidebarState` composable 保存於 `localStorage`
- Mobile：`temporary` prop，由 layout 傳入 `v-model`，nav item 點擊後自動關閉；mobile 顯示 `v-app-bar` + hamburger 按鈕

**理由**：`rail` 是 Vuetify 原生支援的窄版模式；`temporary` 是 overlay 模式的標準作法。用 `useDisplay().mobile` 偵測 breakpoint，同一元件處理兩種情境，不需要額外邏輯分支。

---

### Decision 3：Breadcrumb 獨立元件，自動從路由生成

**選擇**：新增 `Breadcrumb.vue`，從 `useRoute().path` 切分 segments 自動生成，各頁面直接使用 `<LayoutBreadcrumb />`，無需傳 props。

**理由**：路由即資訊，不需要每個頁面手動維護 breadcrumbs 陣列。自動生成減少重複，且路由結構改變時無需逐頁更新。

**替代方案**：PageHeader 接收 `breadcrumbs` prop → 捨棄，維護成本高，各頁面需手動同步路由。

---

### Decision 4：PageHeader 只負責頁面標題

**選擇**：`PageHeader.vue` 只接收 `title` prop，不含 breadcrumb 邏輯。Breadcrumb 與 PageHeader 各自獨立，頁面依序組合 `<LayoutBreadcrumb /> + <LayoutPageHeader />`。

**理由**：單一職責。Breadcrumb 是路由資訊，PageHeader 是頁面語意，兩者獨立更容易個別調整。

---

### Decision 5：Vuetify theme token 在 plugins/vuetify.ts 集中定義

**選擇**：在 `plugins/vuetify.ts` 的 `themes.light.colors` 定義 `primary: '#1967D2'`，其餘沿用 Vuetify 預設。

**理由**：集中管理，不散落在各 component 的 inline style。未來換色只改一處。

## Risks / Trade-offs

- **[Trade-off] Rail mode 在 icon-only 狀態下，subheader 文字隱藏**
  → Vuetify rail 本身行為，符合預期，無需處理。

- **[Trade-off] Breadcrumb 自動生成依賴路由命名**
  → Segment 名稱取自 URL path，大寫首字母。若路由 slug 與顯示名稱差異大（如 `/iam` 顯示為 "Iam"），需在元件內加入 label mapping。目前接受此行為。

- **[風險] 既有頁面若直接使用 `<v-app-bar>` 會與 layout 衝突**
  → 確認所有頁面均透過 layout slot 渲染，無頁面直接引用 AppHeader，移除後無殘留。

## Migration Plan

1. 更新 Vuetify theme（`plugins/vuetify.ts`）
2. 重寫 `AppDrawer.vue`（rail、project name、使用者區塊、RWD）
3. 新增 `Breadcrumb.vue`、`PageHeader.vue`
4. 更新 `layouts/default.vue`：移除 `<LayoutAppHeader />`，加入 mobile `v-app-bar`
5. 更新所有頁面：加入 `<LayoutBreadcrumb />` + `<LayoutPageHeader title="..." />`
6. 廢棄 `AppHeader.vue`（保留檔案標記 deprecated）

**Rollback**：所有變更均在 UI 層，無資料異動。git revert 即可還原。
