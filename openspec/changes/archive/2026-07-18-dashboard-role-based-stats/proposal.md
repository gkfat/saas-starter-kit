## Why

`pages/dashboard/index.vue`（登入後首頁）目前只顯示一張卡片，內容是使用者 email/uid 與 role chip，對任何角色都一樣，沒有實際資訊價值。superadmin / admin 需要在首頁快速掌握會員經營概況：目前會員組成（總數/啟用中/新註冊/已停用）、成長趨勢（今日/本週/本月新增）、以及活躍度（DAU/WAU/MAU、今日登入成功與失敗次數、活躍率）。一般會員（member）不需要看到這些管理數據，不應能造訪此頁。

## What Changes

- 移除 `pages/dashboard/index.vue` 現有的 email/role 卡片內容
- 新增三張卡片，各自獨立元件，比照 `pages/profile/components/ProfileInfoCard.vue` 的 `CardsAppCard` + `v-card-title` + caption/value layout：
  - **使用者總覽**：總會員數、啟用中／新註冊／已停用人數
  - **使用者成長**：今日／本週／本月新增會員數（日曆區間）
  - **活躍使用者**：DAU（今日有登入）、WAU（近 7 天有登入）、MAU（近 30 天有登入）、今日登入次數（成功／失敗）、活躍率（MAU ÷ 總會員數）
- 新增後端 API `GET /api/dashboard/stats`，一次回傳上述三張卡片所需的完整統計資料，需要 `users:read` 與 `login_logs:read` 權限
- 前端每 60 秒自動重新查詢一次統計數字，離開頁面時清除 interval
- 新增 `dashboard:read` 權限：`superadmin` 透過既有 bypass 機制自動具備，`admin` 於 `RolePermissions.admin` 加入該權限，`member` 不具備
- `/dashboard` route 新增權限保護：不具備 `dashboard:read` 權限的使用者（即 `member`）造訪 `/dashboard` 時 **BREAKING** 改為導向 `/profile`
- **BREAKING**（本次未歸檔範圍內的自我修正）：移除先前實作的單一「今日概況」卡片（`DashboardStatsCard.vue`）與其對應的 `getTodayRegistrationCount`／`getTodaySuccessfulLoginCount`，改為下方 Impact 所述的新模組與元件

## Capabilities

### New Capabilities

- `dashboard-home`: 登入後首頁（`pages/dashboard/index.vue`）僅 `dashboard:read` 權限使用者（superadmin/admin）可造訪，顯示使用者總覽／使用者成長／活躍使用者三張卡片並每 60 秒輪詢；member 被導向 `/profile`

### Modified Capabilities

(無，`admin-dashboard` spec 涵蓋的是 `/admin/*` 後台區塊，與本次變更的登入後首頁 `pages/dashboard` 是不同頁面，不受影響)

## Impact

- 新增 `server/modules/dashboard/`（`dashboard.service.ts`、`dashboard.types.ts`、`index.ts`）：組合 `users`、`logs`、`auth` 三個既有模組的資料，計算總覽／成長／活躍度統計，是本次唯一擁有這塊 business logic 的地方
- `server/modules/users`：移除本次先前新增但未被其他地方使用的 `countUsersCreatedSince`（repo）與 `getTodayRegistrationCount`（service），改由 `dashboard.service.ts` 直接使用既有 `getAllUsers()`
- `server/modules/logs`：`getTodaySuccessfulLoginCount` 改為 `getTodayLoginCounts()`，回傳 `{ success, failure }`
- `server/api/dashboard/stats.get.ts`：改為呼叫 `getDashboardStats()`，保持 thin handler
- 移除 `pages/dashboard/components/DashboardStatsCard.vue`，新增三個獨立卡片元件：`UserOverviewCard.vue`、`UserGrowthCard.vue`、`ActiveUsersCard.vue`
- `pages/dashboard/index.vue`：改為容器角色，負責 `useAuthFetch` + 60 秒輪詢，並將對應資料切片以 props 傳給三張卡片
- `i18n/locales/{en,zh-TW}.json`：移除 `dashboard.todayOverview`／`todayRegistrations`／`todayLogins`，新增 `dashboard.userOverview.*`／`userGrowth.*`／`activeUsers.*`；使用者狀態文案沿用既有 `users.status.*`（`enabled`/`disabled`/`pendingPassword`）不重複定義
- `shared/permissions.ts`：新增 `Dashboard.Read`（`dashboard:read`）權限與 `PermissionMeta`
- `shared/roles.ts`：`RolePermissions.admin` 新增 `dashboard:read`
- `config/app-routes.ts`：`RouteItem`/`flattenRoutePermissions()` 新增可選 `redirectTo`（預設 `/dashboard`），`/dashboard` route 設定 `permission: Dashboard.Read`、`redirectTo: '/profile'`
- `middleware/auth.global.ts`：權限不足時改用 `matched.redirectTo ?? '/dashboard'` 取代原本寫死的 `/dashboard`
