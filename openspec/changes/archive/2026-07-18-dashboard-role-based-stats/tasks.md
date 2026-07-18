## 1. Users module：今日註冊數（初版——已被第 9 組取代）

- [x] 1.1 ~~`server/modules/users/users.repo.ts` 新增 `countUsersCreatedSince`~~ → 已移除，改由第 9 組 `dashboard.service.ts` 直接用 `getAllUsers()` 計算，避免 superadmin 誤算
- [x] 1.2 ~~`server/modules/users/users.service.ts` 新增 `getTodayRegistrationCount`~~ → 同上，已移除
- [x] 1.3 ~~`server/modules/users/index.ts` 匯出 `getTodayRegistrationCount`~~ → 同上，已移除匯出

## 2. Logs module：今日成功登入數（初版——已被第 10 組取代）

- [x] 2.1 `server/modules/logs/logs.repo.ts` 新增 `listLoginLogsSince(since: string): Promise<LoginLog[]>`（單欄位 `timestamp >= since` range query，不加 `result` 條件、不 `limit`）——仍保留給第 10 組使用
- [x] 2.2 ~~`server/modules/logs/logs.service.ts` 新增 `getTodaySuccessfulLoginCount`~~ → 改為第 10 組的 `getTodayLoginCounts()`（同時回傳成功與失敗數）
- [x] 2.3 ~~`server/modules/logs/index.ts` 匯出 `getTodaySuccessfulLoginCount`~~ → 改為匯出 `getTodayLoginCounts`

## 3. API：GET /api/dashboard/stats（初版——已被第 11 組取代）

- [x] 3.1 ~~新增 `server/api/dashboard/stats.get.ts`：依序 requirePermission~~ → 權限檢查沿用，內容改為呼叫第 9 組的 `getDashboardStats()`（見第 11 組）
- [x] 3.2 ~~平行呼叫 `getTodayRegistrationCount()`、`getTodaySuccessfulLoginCount()`~~ → 改為第 11 組

## 4. 前端：i18n 文案（今日概況——已被第 12 組取代）

- [x] 4.1 ~~`dashboard.*` 新增 `todayRegistrations`、`todayLogins`、`memberWelcome`~~ → 已移除，改為第 12 組的 `userOverview`/`userGrowth`/`activeUsers` 巢狀 key
- [x] 4.2 `i18n/locales/en.json` 同步移除對應 key（見第 12 組）

## 5. 前端：統計卡片元件（單一卡片版——已被第 13 組取代）

- [x] 5.1 ~~新增 `pages/dashboard/components/DashboardStatsCard.vue`~~ → 已移除，改為三個獨立卡片元件（見第 13 組）
- [x] 5.2 ~~元件內用 `useAuthFetch` 取得並顯示~~ → fetch 邏輯移至 `pages/dashboard/index.vue`（見第 14 組），卡片元件改為純呈現
- [x] 5.3 ~~`onMounted`/`onUnmounted` 輪詢~~ → 同上，移至 `pages/dashboard/index.vue`

## 6. 前端：dashboard/index.vue（依角色分流版——已被第 7 組取代）

- [x] 6.1 移除現有 email/uid + role chip 卡片內容
- [x] 6.2 ~~用 `computed` 依角色決定顯示卡片或歡迎文字~~ → 改為第 7 組：不再需要角色分流
- [x] 6.3 ~~member 分支顯示歡迎文字~~ → 改為第 7 組：member 由 route middleware 導向 `/profile`

## 7. 權限保護與 Route 導向（dashboard:read 權限）

- [x] 7.1 `shared/permissions.ts` 新增 `Dashboard: { Read: 'dashboard:read' }` 與對應 `PermissionMeta` 文案
- [x] 7.2 `shared/roles.ts` 的 `RolePermissions.admin` 加入 `Permission.Dashboard.Read`（`superadmin` 維持既有 bypass，不需加入；`member` 不加入）
- [x] 7.3 `config/app-routes.ts`：`RouteItem` 新增可選欄位 `redirectTo?: string`；`flattenRoutePermissions()` 回傳結果一併帶出 `redirectTo`；`/dashboard` route item 設定 `permission: Permission.Dashboard.Read`、`redirectTo: '/profile'`
- [x] 7.4 `middleware/auth.global.ts`：權限不足時的 `navigateTo('/dashboard')` 改為 `navigateTo(matched.redirectTo ?? '/dashboard')`
- [x] 7.5 `pages/dashboard/index.vue`：移除 `computed` role 判斷與 member 歡迎文字分支
- [x] 7.6 `i18n/locales/{zh-TW,en}.json`：移除不再使用的 `dashboard.memberWelcome` key

## 8. 清理：移除初版「今日概況」統計程式碼

- [x] 8.1 `server/modules/users/users.repo.ts` 移除 `countUsersCreatedSince`
- [x] 8.2 `server/modules/users/users.service.ts` 移除 `getTodayRegistrationCount`（含 `dayjs` import 若無其他用途一併移除）
- [x] 8.3 `server/modules/users/index.ts` 移除 `getTodayRegistrationCount` 匯出
- [x] 8.4 刪除 `pages/dashboard/components/DashboardStatsCard.vue`
- [x] 8.5 `i18n/locales/{zh-TW,en}.json` 移除 `dashboard.todayOverview`／`todayRegistrations`／`todayLogins`

## 9. 新增 server/modules/dashboard 模組

- [x] 9.1 新增 `server/modules/dashboard/dashboard.types.ts`：定義 `DashboardStats` type（`userOverview`/`userGrowth`/`activeUsers`，結構見 design.md Decision 6）
- [x] 9.2 新增 `server/modules/dashboard/dashboard.service.ts`：`getDashboardStats(): Promise<DashboardStats>`
  - 呼叫 `getAllUsers()`（`users` 模組）取得全部使用者
  - 對每筆使用者呼叫 `getAuthAccountStatus(uid)`（`auth` 模組）取得 `isSuperAdmin`/`disabled`，過濾掉 `isSuperAdmin` 者
  - 用 `dayjs` 計算 `userOverview`（啟用中/新註冊/已停用，判斷順序見 design.md Decision 2）、`userGrowth`（今日/本週/本月，日曆區間）、`activeUsers.dau/wau/mau`（滾動區間，見 design.md Decision 3/4）
  - 呼叫 `getTodayLoginCounts()`（`logs` 模組，見第 10 組）取得 `activeUsers.todayLogins`
  - 計算 `activeUsers.activeRate = mau / total`（`total` 為 0 時回傳 `0`）
- [x] 9.3 新增 `server/modules/dashboard/index.ts`：匯出 `getDashboardStats`、`type DashboardStats`

## 10. Logs module：今日登入成功/失敗次數

- [x] 10.1 `server/modules/logs/logs.service.ts` 新增 `getTodayLoginCounts(): Promise<{ success: number; failure: number }>`：若 `FeatureFlag.LoginLog` 未啟用回傳 `{ success: 0, failure: 0 }`；否則呼叫既有 `listLoginLogsSince(dayjs().startOf('day').toISOString())` 並在應用層依 `result` 分組計數
- [x] 10.2 `server/modules/logs/index.ts` 匯出 `getTodayLoginCounts`

## 11. API：GET /api/dashboard/stats（改為呼叫新模組）

- [x] 11.1 `server/api/dashboard/stats.get.ts` 改為：`requirePermission(event, Permission.Users.Read)`、`requirePermission(event, Permission.LoginLogs.Read)`，然後回傳 `getDashboardStats()`（`dashboard` 模組）

## 12. 前端：i18n 文案（三張卡片）

- [x] 12.1 `i18n/locales/zh-TW.json` 的 `dashboard.*` 新增巢狀 key：`userOverview.{title,total}`、`userGrowth.{title,today,thisWeek,thisMonth}`、`activeUsers.{title,dau,wau,mau,todayLogins,loginSuccess,loginFailure,activeRate}`；狀態文案（啟用中/新註冊/已停用）沿用既有 `users.status.*`，不重複定義
- [x] 12.2 `i18n/locales/en.json` 補上對應英文 key

## 13. 前端：三張卡片元件（純呈現，props 傳入）

- [x] 13.1 新增 `pages/dashboard/components/UserOverviewCard.vue`：props 接收 `{ total, active, pendingPassword, disabled }`，比照 `ProfileInfoCard.vue` 的 `CardsAppCard` + `v-card-title` + caption/value layout，狀態標籤沿用 `$t('users.status.*')`
- [x] 13.2 新增 `pages/dashboard/components/UserGrowthCard.vue`：props 接收 `{ today, thisWeek, thisMonth }`，同上 layout
- [x] 13.3 新增 `pages/dashboard/components/ActiveUsersCard.vue`：props 接收 `{ dau, wau, mau, todayLogins: { success, failure }, activeRate }`，同上 layout，`activeRate` 顯示為百分比

## 14. 前端：dashboard/index.vue 作為容器

- [x] 14.1 `pages/dashboard/index.vue` 用 `useAuthFetch<DashboardStats>('/api/dashboard/stats')` 取得資料，`onMounted` 用 `setInterval(refresh, 60_000)` 每 60 秒刷新，`onUnmounted` 清除計時器
- [x] 14.2 版面用 `v-row`/`v-col` 排列三張卡片，分別傳入 `stats.userOverview`/`stats.userGrowth`/`stats.activeUsers` 作為 props

## 15. 驗證

- [x] 15.1 `pnpm lint` 通過（並以 `pnpm build` 確認型別編譯正確，過程中發現並修正 `dashboard.service.ts` 誤用 `~/server/modules/*` 絕對路徑，改為模組內慣用的相對路徑 `../auth`/`../logs`/`../users`）
- [ ] 15.2 手動以 superadmin / admin 登入，確認 `/dashboard` 顯示三張卡片且數字合理（總覽三者加總等於總會員數，admin/member 兩者加總也等於總會員數），並確認每 60 秒輪詢
- [ ] 15.3 手動以 member 登入造訪 `/dashboard`，確認被導向 `/profile`、不呼叫 `/api/dashboard/stats`
- [ ] 15.4 確認離開 `/dashboard`（superadmin/admin 身分）後不再有 `/api/dashboard/stats` 請求（清除 interval 生效）

## 16. 使用者總覽新增各角色人數

- [x] 16.1 `server/modules/dashboard/dashboard.types.ts`：`UserOverviewStats` 新增 `byRole: { admin: number; member: number }`
- [x] 16.2 `server/modules/dashboard/dashboard.service.ts`：於快照階段一併呼叫 `getRoleForUser(uid)`（`roles` 模組），計算 `byRole.admin`/`byRole.member`
- [x] 16.3 `pages/dashboard/components/UserOverviewCard.vue`：新增兩欄顯示 `role.admin`/`role.member` 人數（沿用既有 `role.*` i18n key，不新增文案）
- [x] 16.4 `pnpm lint` 與 `pnpm build` 通過
