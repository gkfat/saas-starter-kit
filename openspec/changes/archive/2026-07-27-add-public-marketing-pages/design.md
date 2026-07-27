## Context

`pages/index.vue` 目前是純轉導頁（`await navigateTo('/dashboard', { replace: true })`），且 `middleware/auth.global.ts` 在頁面轉導發生前就已攔截：`/` 不在現有 `PUBLIC_ROUTES`（`/login`、`/auth/register`）內，未登入訪問任何非 `PUBLIC_ROUTES` 路徑會被導向 `/login`，因此訪客目前根本無法看到 `/` 的內容。`layouts/default.vue`（含 `AppHeader`、`AppDrawer`）與 `layouts/blank.vue`（純 `v-main`，用於 `/login`）是僅有的兩種版面；`AppDrawer.vue` 的 `visibleGroups` 目前假設一定有登入使用者（`user.value` 存在時才有意義），`#append` 區塊固定顯示頭像/租戶名稱/登出按鈕。`config/app-routes.ts` 的 `RouteItem` 目前只有 `permission` 欄位控制顯示與否。

## Goals / Non-Goals

**Goals:**

- 未登入訪客可直接瀏覽 `/home`、`/features`、`/pricing`、`/changelog`，已登入使用者也能瀏覽（不因為「公開」而被排除）
- `/` 本身改為純轉導頁：已登入依權限導向 `/dashboard` 或 `/profile`；未登入導向 `/home`
- 這四個頁面沿用現有 `layouts/default.vue`（含 `AppDrawer`），並在 `AppDrawer` 底部新增 `/features`、`/pricing`、`/changelog` 三個連結
- `AppDrawer` 在未登入狀態下：隱藏所有依權限判斷的既有導覽項目（Dashboard、Profile、Admin 相關），底部區塊以「登入」按鈕取代頭像/租戶名稱/登出按鈕
- `/changelog` 呈現既有 `CHANGELOG.md` 內容，不建立第二份需要人工維護的資料來源

**Non-Goals:**

- 不新增 Markdown 渲染函式庫依賴——`CHANGELOG.md` 格式固定（`##`/`###` 標題、`-` 條列），以輕量手刻解析涵蓋現有格式即可，不足以支撐任意 Markdown 語法（如表格、程式碼區塊）
- 不做行銷頁的 CMS/後台可編輯內容管理，特色頁與方案頁內容為靜態文案，寫死於頁面元件
- 不改變任何既有已登入頁面（Dashboard、Profile、Admin）的導覽權限邏輯
- 不處理 SEO（meta tags、sitemap 等）——專案為 SPA 模式，SEO 優化非本次範圍

## Decisions

### 1. 新增「公開內容路由」分類，與現有 `PUBLIC_ROUTES`（登入流程用）語意不同

`middleware/auth.global.ts` 現有 `PUBLIC_ROUTES`（`/login`）的語意是「未登入可進，已登入會被導離」。本次新增的 5 個路徑（`/`、`/home`、`/features`、`/pricing`、`/changelog`）語意不同：**不論是否登入都可進，不強制要求登入，也不會把已登入使用者導離**。因此新增獨立的 `PUBLIC_CONTENT_ROUTES` 集合，中介層邏輯調整為：

```ts
const PUBLIC_ROUTES = new Set(['/login']);
const PUBLIC_CONTENT_ROUTES = new Set(['/', '/home', '/features', '/pricing', '/changelog']);

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  if (!auth.isReady) return;

  if (PUBLIC_CONTENT_ROUTES.has(to.path)) return; // 一律放行，不轉導

  if (PUBLIC_ROUTES.has(to.path)) {
    if (auth.isLoggedIn) return navigateTo('/dashboard');
    return;
  }

  if (!auth.isLoggedIn) return navigateTo('/login');
  // ...既有權限檢查
});
```

`/` 與 `/home` 拆成兩個獨立頁面分工：`pages/index.vue` 只負責轉導判斷（已登入依權限轉 `/dashboard` 或 `/profile`；未登入轉 `/home`），不渲染任何畫面；行銷首頁內容改放在 `pages/marketing/home/index.vue`（路徑 `/home`），中介層對兩者一視同仁地放行，轉導邏輯完全由 `pages/index.vue` 頁面層級處理。

**Alternative considered**：把 `/`、`/home`、`/features`、`/pricing`、`/changelog` 直接併入現有 `PUBLIC_ROUTES`。會導致已登入使用者訪問 `/features` 時被現有邏輯（`if (auth.isLoggedIn) return navigateTo('/dashboard')`）錯誤地導離，不符合「已登入使用者也能瀏覽」的目標，故新增獨立集合而非重用。

### 2. `RouteItem` 新增 `public?: boolean` 欄位，`AppDrawer` 依登入狀態調整可見性

`config/app-routes.ts` 新增一個獨立的路由群組（不屬於 `nav.groupManagement`/`nav.groupIam`），項目標記 `public: true`：

```ts
{
  label: 'nav.groupAbout',
  items: [
    { title: 'nav.features', icon: 'mdi-star-outline', path: '/features', public: true },
    { title: 'nav.pricing', icon: 'mdi-tag-outline', path: '/pricing', public: true },
    { title: 'nav.changelog', icon: 'mdi-history', path: '/changelog', public: true },
  ],
}
```

`AppDrawer.vue` 的 `visibleGroups` 過濾邏輯調整為：

```ts
const visibleGroups = computed(() =>
  APP_ROUTES.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        item.public || (auth.isLoggedIn && (!item.permission || hasPermission(item.permission))),
    ),
  })).filter((group) => group.items.length > 0),
);
```

未登入時，僅 `public: true` 的項目通過過濾，其餘既有項目（Dashboard、Profile、Admin 系列，皆非 `public`）自動隱藏，不需額外針對「未登入」寫特殊排除清單。`/home` 不加入 `APP_ROUTES`（不出現在導覽清單中），僅能透過首頁轉導或 `AppDrawer` 頂部 logo 連結（導向 `/`）間接進入。

**Alternative considered**：把這三個公開頁面連結直接寫死在 `AppDrawer.vue` 模板中，繞過 `APP_ROUTES` 設定。會讓路由清單分散在兩個地方（`config/app-routes.ts` 用於 `flattenRoutePermissions()`、模板寫死的部分不受該機制管理），維護時容易遺漏；沿用既有 `APP_ROUTES` 機制並擴充欄位，符合「集中設定」的既有慣例。

### 3. `AppDrawer` 底部區塊依 `auth.isLoggedIn` 分流渲染，頂部 logo 導向 `/`

`#append` 區塊原本固定渲染頭像/租戶名稱/登出按鈕；改為 `v-if="auth.isLoggedIn"` 顯示原有內容，`v-else` 顯示一個導向 `/login` 的「登入」按鈕（樣式與現有登出按鈕一致，維持底部區塊的視覺一致性）。`AppDrawer` 頂部的專案 logo 區塊新增點擊事件，導向 `/`；實際落地頁（`/dashboard`、`/profile`、`/home`）由 `/` 的轉導邏輯決定，logo 本身不需要知道登入狀態。

### 4. `/changelog` 以建置期讀入 `CHANGELOG.md` 原始文字 + 手刻輕量解析渲染

透過 Vite 的 `?raw` 匯入取得檔案原始內容（`import changelogRaw from '~/CHANGELOG.md?raw'`），在 `pages/marketing/changelog/index.vue` 內以簡單規則解析：`## [...]` 視為版本區塊標題、`### Added`/`### Changed` 視為分類子標題、`- ` 開頭視為條列項目，逐行轉換為對應的 Vuetify 排版元件（`v-card`/`v-list`）呈現，不逐字還原 Markdown 語法（如粗體、連結）。

**Alternative considered**：引入 `markdown-it` 或類似套件做完整 Markdown 轉 HTML。`CHANGELOG.md` 格式固定且簡單，完整 Markdown 解析器對此需求是過度設計，且需要走專案的「新增依賴前需確認」流程；若未來格式變複雜（如需要程式碼區塊、表格），可再評估导入套件。

## Risks / Trade-offs

- [`CHANGELOG.md` 若未來改用更複雜的 Markdown 語法（表格、巢狀列表、程式碼區塊），手刻解析器會顯示錯誤或遺漏內容] → 現有檔案格式穩定且由團隊自行維護，可在 tasks 中要求解析器對非預期格式行做「原樣輸出」的保底處理（不 silently drop 內容）
- [`/changelog` 內容含技術性描述（如「Firestore 區分 dev, prod 前綴」），對一般訪客可能過於技術化] → 屬內容撰寫層面的取捨，不影響本次機制實作；若需要更貼近使用者的措辭，可後續另行調整 `CHANGELOG.md` 文字，不需改動渲染機制
- [新增 `PUBLIC_CONTENT_ROUTES` 與既有 `PUBLIC_ROUTES` 兩種語意不同的公開路由集合，增加 `middleware/auth.global.ts` 的分支複雜度] → 兩者語意本質不同（一個要求「已登入則導離」，一個「一律放行」），強行合併成單一集合反而會讓行為判斷更隱晦，分開的兩個 `Set` 加上清楚命名已是最小必要複雜度
- [`/` 與 `/home` 拆成兩個頁面，比原規劃（`/` 直接渲染行銷內容）多一個檔案與一次轉導] → 換來 `/` 語意單純化（純轉導）與 `/home` 可被直接分享/加入書籤而不受登入狀態影響落地內容，判斷為值得的取捨

## Migration Plan

1. `middleware/auth.global.ts` 新增 `PUBLIC_CONTENT_ROUTES`（`/`、`/home`、`/features`、`/pricing`、`/changelog`）並調整判斷順序
2. `config/app-routes.ts` 的 `RouteItem` 新增 `public?: boolean`，新增第三個公開路由群組（`/features`、`/pricing`、`/changelog`）
3. `AppDrawer.vue` 調整 `visibleGroups` 過濾邏輯、`#append` 區塊（登入按鈕 vs 使用者資訊/登出）、頂部 logo 點擊導向 `/`
4. 新增 `pages/marketing/features/index.vue`、`pages/marketing/pricing/index.vue`、`pages/marketing/changelog/index.vue`、`pages/marketing/home/index.vue`
5. 修改 `pages/index.vue`：改為純轉導頁（已登入依權限轉 `/dashboard`/`/profile`，未登入轉 `/home`）
6. 新增 i18n 文案
7. 手動驗證：未登入／已登入兩種狀態下，分別瀏覽 `/`、`/home`、`/features`、`/pricing`、`/changelog`，確認可正常進入且 `AppDrawer` 顯示符合預期

無資料庫遷移；純前端頁面與路由設定變更，回滾即為還原對應檔案。

## Open Questions

（無）
