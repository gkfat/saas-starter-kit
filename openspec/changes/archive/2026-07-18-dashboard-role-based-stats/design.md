## Context

`pages/dashboard/index.vue` 是登入後導向的首頁。superadmin/admin 需要三張卡片：使用者總覽（總會員數、啟用中/新註冊/已停用）、使用者成長（今日/本週/本月新增）、活躍使用者（DAU/WAU/MAU、今日登入成功/失敗次數、活躍率）。member 不具備 `dashboard:read` 權限，被 middleware 導向 `/profile`，不會渲染此頁（見 Decision 8）。

資料來源：

- 使用者：`users` collection（`server/modules/users/users.repo.ts`），每筆文件有 `createdAt`（ISO string）、`lastLoginAt`（ISO string | null）、`passwordSetupPending`（boolean）。
- 帳號啟用狀態：`disabled` 並非 Firestore 欄位，而是 Firebase Auth 的屬性，需透過 `adminAuth().getUser(uid)` 逐一查詢（見 `server/modules/auth/auth.service.ts` 的 `getAuthAccountStatus`，`server/api/admin/users.get.ts` 已是這種「抓全部使用者 + 逐一查 Auth 狀態」的既有模式）。
- superadmin 帳號本身在 `users` collection 中也有一筆文件（見 `scripts/seed-superadmin.ts`），但沒有 Firestore 欄位可以直接篩掉它；必須透過 Auth 的 custom claims（`isSuperAdmin`）才能識別並排除，Firestore 端的 `.count()` aggregation 無法做到。
- 登入紀錄：`login_logs` collection 的 `timestamp` + `result`（見 `server/modules/logs/logs.repo.ts`），寫入受 `FeatureFlag.LoginLog` 控制，可能被關閉。

## Goals / Non-Goals

**Goals:**

- 新增一支只讀的 dashboard 統計 API，一次回傳三張卡片所需的完整資料
- 統計數字正確排除 superadmin（不能只靠 Firestore 欄位過濾）
- 卡片視覺對齊 `ProfileInfoCard.vue` 既有的 `CardsAppCard` + `v-card-title` + caption/value layout，一張卡片一個元件

**Non-Goals:**

- 不做歷史趨勢圖表、不做可自訂時間區間查詢
- 不引入新的第三方套件（如 VueUse）做 interval，沿用 `setInterval`/`onUnmounted`
- 不處理跨時區顯示問題（另有獨立 `add-timezone-display` 提案在追蹤，本次沿用現有 `dayjs` 預設（伺服器本地時區）行為，與既有 `formatDateTime` 一致）

## Decisions

1. **統一快照計算，取代多支 Firestore aggregate query**：新增 `server/modules/dashboard/dashboard.service.ts`，內部呼叫既有 `getAllUsers()`（`users` 模組）取得全部使用者，再對每筆文件呼叫 `getAuthAccountStatus()`（`auth` 模組，做法與 `server/api/admin/users.get.ts` 相同）取得 `isSuperAdmin`/`disabled`，過濾掉 `isSuperAdmin` 的文件後，在應用層（記憶體中）用 `dayjs` 比較 `createdAt`/`lastLoginAt` 計算所有卡片數字。
   - 理由：`disabled`/`isSuperAdmin` 只存在於 Firebase Auth，Firestore `.count()` 系列的 aggregation query 無法依這兩者過濾，若各卡片各自發 aggregation query 會不準確（把 superadmin 算進總數/成長/活躍度）。單一快照 + 記憶體計算可以保證所有數字口徑一致，且此 demo 專案使用者量小，逐一查 Auth 狀態的成本可接受（與既有 `/api/admin/users` 相同代價）。
   - 取代先前（本次未歸檔範圍內）實作的 `countUsersCreatedSince`（repo）與 `getTodayRegistrationCount`（service）：這兩個函式用 Firestore aggregation 查 `createdAt`，同樣有 superadmin 誤算問題，故直接移除，改由新模組統一處理。

2. **使用者總覽（啟用中/新註冊/已停用）分類規則**：沿用 `pages/admin/users/components/UsersTable.vue` 既有的 `statusLabel` 判斷順序——`disabled` 優先於 `passwordSetupPending`：
   - 已停用：`disabled === true`
   - 新註冊：`disabled === false && passwordSetupPending === true`
   - 啟用中：其餘（`disabled === false && passwordSetupPending === false`）
   - 理由：與使用者列表頁的狀態呈現邏輯保持一致，避免兩處對「使用者狀態」有不同定義。
   - 使用者總覽同時 SHALL 依角色（`admin`／`member`）分組計數：在快照建立階段額外呼叫既有 `getRoleForUser(uid)`（`roles` 模組）取得每位使用者的角色，與 `isSuperAdmin`/`disabled` 一起在同一個 `Promise.all` 內取得，避免多一輪個別查詢。

3. **使用者成長（今日/本週/本月）是日曆區間**：以 `dayjs().startOf('day' | 'week' | 'month')` 為起點，計算快照中 `createdAt >= 起點` 的人數。
   - 理由：「今日/本週/本月新增」是業務上直覺的日曆概念（例如「這個月」指自然月 1 號至今），不是滾動視窗。

4. **活躍使用者 DAU/WAU/MAU 是滾動區間**：
   - DAU：`lastLoginAt >= dayjs().startOf('day')`（今日內有登入）
   - WAU：`lastLoginAt >= dayjs().subtract(7, 'day')`（近 7 天內有登入）
   - MAU：`lastLoginAt >= dayjs().subtract(30, 'day')`（近 30 天內有登入）
   - 理由：DAU/WAU/MAU 是業界慣用的「活躍度」指標，慣例上以滾動視窗衡量使用者黏著度，與「本週/本月新增」這種日曆區間的成長指標語意不同，兩者並存但不可混用同一種區間定義（design 文件明確標註避免未來混淆）。
   - **活躍率** = `mau / total`（`total` 為快照中排除 superadmin 後的總人數；`total` 為 0 時活躍率回傳 `0`，避免除以零）。

5. **今日登入次數（成功/失敗）**：沿用既有 `listLoginLogsSince(startOfDayIso)`（`logs` 模組 repo，已於本次先前任務新增），取回後在應用層依 `result` 分組計數，回傳 `{ success, failure }`。若 `FeatureFlag.LoginLog` 未啟用，回傳 `{ success: 0, failure: 0 }`，不噴錯誤。
   - 取代先前的 `getTodaySuccessfulLoginCount`（只回傳成功數），改為 `getTodayLoginCounts()` 同時回傳成功與失敗數。
   - 理由：`timestamp` range + `result` equality 的複合 Firestore 查詢需要額外 composite index；沿用單欄位 range query + 應用層 filter，避免部署風險（同前次決策，見 CLAUDE.md「Optimize only when measurable/justified」）。

6. **API 形狀**：單一端點 `GET /api/dashboard/stats`，回傳：

   ```
   {
     userOverview: { total: number; active: number; pendingPassword: number; disabled: number };
     userGrowth: { today: number; thisWeek: number; thisMonth: number };
     activeUsers: {
       dau: number; wau: number; mau: number;
       todayLogins: { success: number; failure: number };
       activeRate: number; // 0-100 或 0-1，前端顯示時格式化為百分比
     };
   }
   ```
   - 理由：前端一次 fetch 取得三張卡片所需的全部資料，符合「一次載入、單一輪詢」的既有模式；不因為卡片變多就拆成三支 API 增加請求數與輪詢管理複雜度。

7. **權限檢查**：維持 `requirePermission(event, Permission.Users.Read)` + `requirePermission(event, Permission.LoginLogs.Read)`（不變）。
   - 理由：新增的統計仍然只是「使用者資料」與「登入紀錄」的衍生數字，沿用既有兩個權限，不新增額外的資料存取權限維度。

8. **「今日/本週/本月」與滾動視窗的時間邊界計算位置**：皆在 server 端計算（沿用專案目前對日期沒有顯式 TZ 設定的慣例，與 `utils/format-date.ts` 一致）。

9. **前端元件拆分**：`pages/dashboard/index.vue` 作為容器，透過 `useAuthFetch<DashboardStats>('/api/dashboard/stats')` 取得資料並持有 60 秒輪詢（`onMounted`/`onUnmounted`，沿用 `setInterval`），再把 `stats.userOverview`/`stats.userGrowth`/`stats.activeUsers` 以 props 分別傳給三個新元件 `pages/dashboard/components/{UserOverviewCard,UserGrowthCard,ActiveUsersCard}.vue`（每個都是單純呈現用元件，不自己發請求）。
   - 理由：避免三張卡片各自 `useAuthFetch` 同一支 API 造成重複請求與三個獨立 interval；容器統一管理資料生命週期，卡片元件保持單純（比照現有 `CardsAppCard` 系列的呈現慣例）。

10. **Dashboard 存取權限與 redirect 機制**（沿用前次決策，未變更）：`dashboard:read` 權限透過 `middleware/auth.global.ts` + `config/app-routes.ts` 的 permission-route 機制保護 `/dashboard`；`RouteItem`/`flattenRoutePermissions()` 新增可選 `redirectTo`（預設 `/dashboard`），`/dashboard` 設定 `redirectTo: '/profile'` 避免無限重導迴圈。

## Risks / Trade-offs

- [Risk] 每次載入 dashboard 都對全部使用者逐一呼叫 Firebase Auth `getUser()`（判斷 disabled/isSuperAdmin），使用者數量成長後會變慢 → Mitigation：demo 專案流量與使用者量可控，非量測到的效能問題前不預先優化；與現有 `/api/admin/users` 相同代價，屬於一致的既有取捨。
- [Risk] 兩個權限（`users:read`、`login_logs:read`）任一缺少會讓整支 API 403 → Mitigation：符合最小權限原則的預期行為；`RolePermissions.admin` 預設已包含兩者。
- [Risk] `dayjs()` 依賴 server process 本地時區，容器部署時區與使用者不一致會有「今日/本週/本月」邊界誤差 → Mitigation：與現有 `formatDateTime` 行為一致，非本次變更範圍；已有獨立 `add-timezone-display` 提案追蹤。
- [Risk] `redirectTo` 為新增的可選欄位，若日後其他 route 也需要自訂 fallback 卻忘記設定，會沿用預設 `/dashboard`，可能造成非預期的重導 → Mitigation：預設值刻意保留原行為，僅 `/dashboard` 這一筆需要特別設定；新增受保護路由時 code review 需檢查是否為需要自訂 `redirectTo` 的特殊情況。
- [Risk] DAU/WAU/MAU 用滾動視窗、使用者成長用日曆區間，兩種時間語意並存容易被誤解為同一種 → Mitigation：design 文件（本節 Decision 3/4）與 spec 皆明確分別標註，前端 i18n label 也需清楚區分（例如「本月新增」vs「近 30 天活躍」）。
