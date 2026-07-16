## Context

`login_logs`/`audit_logs` 目前分別由 `server/modules/logs`（`recordLoginLog`/`recordAuditLog`/`listLoginLogs`/`listAuditLogs`）、對應 API（`server/api/admin/logs/{login,audit}.get.ts`）、頁面（`pages/admin/logs/{login,audit}.vue`）、導覽項目（`config/app-routes.ts` 內 `RouteItem.permission`）組成。寫入呼叫散落在多處：`server/modules/auth/auth.service.ts`（3 處登入紀錄）、`server/api/admin/users/[id].patch.ts`、`server/api/admin/role-permissions.patch.ts`（稽核紀錄）。現有 RBAC 已有「權限清單 → 過濾導覽/阻擋路由/API 檢查」的完整模式（`config/app-routes.ts` 的 `flattenRoutePermissions()`、`middleware/auth.global.ts`、`server/shared/rbac.ts` 的 `requirePermission`），本次 feature flag 機制刻意比照此模式設計，降低理解成本並方便未來新增第三個模組旗標時依樣複製。

專案為 SPA 模式（`ssr: false`），`runtimeConfig.public` 是唯一能讓「同一份設定」在 server（Nitro API）與 client（瀏覽器 bundle）都讀得到的官方管道；`APP_ENV` 目前僅透過 server-only 的 `firestore-prefix.ts` 讀取 `process.env`，不適合此處沿用（feature flag 需要前端也能讀取以隱藏導覽項目）。

## Goals / Non-Goals

**Goals:**

- 提供 `auditLog`、`loginLog` 兩個獨立旗標，各自可透過環境變數關閉，預設啟用
- 關閉的模組：寫入呼叫變 no-op（不影響呼叫端的既有邏輯/回應）、讀取 API 回傳明確的「功能未啟用」錯誤、前端導覽與頁面路由被阻擋
- 建立可複製的通用模式，未來新增模組旗標時只需比照擴充旗標清單與少數檢查點
- 一個模組關閉時，不影響另一個模組或系統其他功能（登入、RBAC、使用者管理）正常運作

**Non-Goals:**

- 不做執行期（runtime）動態切換（如管理後台 UI 開關）；旗標於部署時透過環境變數決定，變更需重新部署
- 不做每租戶（per-tenant）獨立旗標；本次為全域（整個部署實例）層級開關
- 不刪除既有 Firestore 中已寫入的 `login_logs`/`audit_logs` 歷史資料；關閉僅停止新寫入與存取，不做資料清除
- 不擴充到 `login_logs`/`audit_logs` 以外的模組（`users`、`roles` 等核心模組不在本次旗標範圍內，避免使用者誤關閉導致系統不可用）

## Decisions

### 1. 環境變數 + `runtimeConfig.public`，而非 Firestore 設定文件

新增 `FEATURE_AUDIT_LOG_ENABLED`、`FEATURE_LOGIN_LOG_ENABLED`（值為 `'true'`/`'false'`，未設定時視為啟用），於 `nuxt.config.ts` 解析後放入 `runtimeConfig.public.featureFlags: { auditLog: boolean; loginLog: boolean }`。前後端皆透過 `useRuntimeConfig().public.featureFlags` 讀取同一份值。

**Alternative considered**：將旗標存於 Firestore（比照 `role_permissions` 的執行期可調整模式）。這會讓「已停用的模組」仍需維持一條可用的 Firestore 讀取路徑（矛盾：模組都關了還要讀資料庫確認要不要關），且增加快取/一致性複雜度；本次需求聚焦「部署時決定」，環境變數已足夠，故不採用。

### 2. `shared/feature-flags.ts` 只定義鍵值與型別，不讀取環境變數

比照 `shared/permissions.ts`／`shared/roles.ts` 的角色定位（`shared/` 對任何模組零依賴），新增：

```ts
export const FeatureFlag = {
  AuditLog: 'auditLog',
  LoginLog: 'loginLog',
} as const;
export type FeatureFlag = (typeof FeatureFlag)[keyof typeof FeatureFlag];
export type FeatureFlags = Record<FeatureFlag, boolean>;
```

實際讀值（`useRuntimeConfig().public.featureFlags`）留在呼叫端（server 的 service/API、前端的 composable），`shared/feature-flags.ts` 純粹提供鍵名常數與型別，避免 `shared/` 對 Nuxt runtime API 產生依賴。

**Alternative considered**：讓 `shared/feature-flags.ts` 直接讀 `process.env`。在 client bundle 中 `process.env` 不會被正確替換成實際值（除非透過 Nuxt/Vite 的 `define`），會導致前後端旗標不一致；改用 `runtimeConfig.public` 是 Nuxt 官方保證前後端同步的機制，故不採用。

### 3. 後端寫入點：service 層內判斷，呼叫端不變

`recordAuditLog`/`recordLoginLog`（`server/modules/logs/logs.service.ts`）內部在寫入前檢查對應旗標，disabled 時直接 `return`（no-op），不拋出例外。呼叫端（`auth.service.ts`、`[id].patch.ts`、`role-permissions.patch.ts`）維持現有 `await recordXxxLog(...)` 或 `.catch(...)` 呼叫方式，完全不需修改——這確保「關閉稽核紀錄」不會讓「調整使用者角色」失敗。

**Alternative considered**：在每個呼叫端各自加上 `if (isEnabled) await recordAuditLog(...)`。會讓判斷邏輯分散到 3+ 個檔案，且未來新增呼叫點容易忘記檢查，故不採用；集中在 service 層一處判斷最符合現有「service 層擁有業務邏輯」的分層原則。

### 4. 讀取 API：明確回傳「功能未啟用」錯誤，而非空陣列

`GET /api/admin/logs/audit`、`GET /api/admin/logs/login` 在 handler 開頭檢查旗標，disabled 時 `throw createError({ statusCode: 404, message: 'Feature disabled' })`，優先於既有的 `requirePermission` 檢查（先驗證功能是否存在，再驗證是否有權限，語意上更合理：功能不存在時不需要洩露權限判斷結果）。

**Alternative considered**：回傳空陣列讓前端表現為「沒有資料」。會讓「功能關閉」與「剛好沒有紀錄」在 UI 上無法區分，且前端仍會顯示整個頁面（含篩選欄位等），不符合「模組關閉時不應存在該頁面」的需求，故不採用。

### 5. 前端：比照 `RouteItem.permission` 新增 `RouteItem.featureFlag`

`config/app-routes.ts` 的 `RouteItem` 型別新增 `featureFlag?: FeatureFlag` 欄位；`/admin/logs/login` 標記 `FeatureFlag.LoginLog`，`/admin/logs/audit` 標記 `FeatureFlag.AuditLog`。新增 `useFeatureFlags()` composable 包裝 `useRuntimeConfig().public.featureFlags`，提供 `isFeatureEnabled(flag)`。

- `components/layout/AppDrawer.vue` 的 `visibleGroups` 過濾條件新增 `&& (!item.featureFlag || isFeatureEnabled(item.featureFlag))`
- `config/app-routes.ts` 新增 `flattenRouteFeatureFlags()`（比照既有 `flattenRoutePermissions()`），供 `middleware/auth.global.ts` 在旗標關閉時導向 `/dashboard`（與現有權限不足時的行為一致）

**Alternative considered**：只隱藏導覽項目，不阻擋直接輸入網址進入頁面。會讓使用者仍可透過網址列直接存取「已關閉」的頁面並觸發讀取 API（雖然 API 會回 404，但頁面本身會顯示錯誤狀態而非「找不到此頁面」的一致體驗），故一併在路由層阻擋。

## Risks / Trade-offs

- [關閉旗標需要重新部署（環境變數變更），無法即時生效] → 符合 Non-Goal 的刻意取捨；本次需求未要求即時切換
- [`shared/feature-flags.ts` 僅定義鍵值，實際值分散在 server 與 client 各自呼叫 `useRuntimeConfig()`，需注意兩處呼叫必須讀同一個 `runtimeConfig.public.featureFlags` 結構，避免鍵名/型別漂移] → 透過共用的 `FeatureFlags` 型別（`Record<FeatureFlag, boolean>`）在兩處呼叫點做型別檢查，編譯期即可抓到不一致
- [新增旗標時容易忘記同步更新 `.env.example` 或 `nuxt.config.ts` 的 fallback 預設值] → tasks 中列為必要步驟並在 design 中明確要求「未設定時預設為 true（啟用）」，避免忘記設定環境變數就導致模組被意外關閉

## Migration Plan

1. 新增 `shared/feature-flags.ts`：`FeatureFlag` 常數與 `FeatureFlags` 型別
2. `nuxt.config.ts` 新增 `runtimeConfig.public.featureFlags`，從 `process.env.FEATURE_AUDIT_LOG_ENABLED`/`FEATURE_LOGIN_LOG_ENABLED` 解析，未設定時預設 `true`
3. 更新 `.env.example` 補上兩個新環境變數與說明註解
4. `server/modules/logs/logs.service.ts` 的 `recordAuditLog`/`recordLoginLog` 加入旗標檢查（no-op）
5. `server/api/admin/logs/audit.get.ts`、`login.get.ts` 加入旗標檢查（404 disabled）
6. 新增 `composables/useFeatureFlags.ts`
7. `config/app-routes.ts` 新增 `featureFlag` 欄位標記與 `flattenRouteFeatureFlags()`
8. `components/layout/AppDrawer.vue` 過濾條件加入旗標判斷
9. `middleware/auth.global.ts` 加入旗標路由阻擋
10. 手動驗證：分別關閉 `auditLog`、`loginLog`（設定環境變數後重啟 `pnpm dev`），確認對應導覽/頁面/API 皆不可用，且使用者角色調整、登入等既有功能不受影響

無資料庫遷移；純設定與程式碼變更，回滾即為還原環境變數與程式碼。

## Open Questions

（無）
