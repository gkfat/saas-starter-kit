## 1. 旗標定義與設定來源

- [x] 1.1 新增 `shared/feature-flags.ts`：`FeatureFlag` 常數（`auditLog`、`loginLog`）與 `FeatureFlags` 型別（`Record<FeatureFlag, boolean>`）
- [x] 1.2 於 `nuxt.config.ts` 新增 `runtimeConfig.public.featureFlags`，從 `process.env.FEATURE_AUDIT_LOG_ENABLED`/`FEATURE_LOGIN_LOG_ENABLED` 解析為 boolean，未設定或非 `'false'` 時預設為 `true`
- [x] 1.3 更新 `.env.example`，新增 `FEATURE_AUDIT_LOG_ENABLED`、`FEATURE_LOGIN_LOG_ENABLED` 並附上說明註解（預設啟用、設為 `false` 停用）

## 2. 後端：寫入行為改為可關閉

- [x] 2.1 於 `server/modules/logs/logs.service.ts` 的 `recordAuditLog` 開頭檢查 `useRuntimeConfig().public.featureFlags.auditLog`，disabled 時直接 `return`（不寫入、不拋錯）
- [x] 2.2 於同檔案 `recordLoginLog` 開頭比照檢查 `featureFlags.loginLog`
- [x] 2.3 確認呼叫端（`server/modules/auth/auth.service.ts`、`server/api/admin/users/[id].patch.ts`、`server/api/admin/role-permissions.patch.ts`）不需修改即可正常運作

## 3. 後端：讀取 API 加入旗標檢查

- [x] 3.1 於 `server/api/admin/logs/audit.get.ts` 開頭檢查 `auditLog` 旗標，disabled 時 `throw createError({ statusCode: 404, message: 'Feature disabled' })`
- [x] 3.2 於 `server/api/admin/logs/login.get.ts` 開頭比照檢查 `loginLog` 旗標
- [x] 3.3 確認旗標檢查優先於既有 `requirePermission` 呼叫

## 4. 前端：導覽與路由阻擋

- [x] 4.1 新增 `composables/useFeatureFlags.ts`，包裝 `useRuntimeConfig().public.featureFlags`，提供 `isFeatureEnabled(flag: FeatureFlag): boolean`
- [x] 4.2 於 `config/app-routes.ts` 的 `RouteItem` 型別新增 `featureFlag?: FeatureFlag` 欄位；`/admin/logs/login` 標記 `FeatureFlag.LoginLog`，`/admin/logs/audit` 標記 `FeatureFlag.AuditLog`
- [x] 4.3 於 `config/app-routes.ts` 新增 `flattenRouteFeatureFlags()`（比照既有 `flattenRoutePermissions()`）
- [x] 4.4 於 `components/layout/AppDrawer.vue` 的 `visibleGroups` 過濾條件加入 `isFeatureEnabled` 檢查，disabled 時不顯示對應導覽項目
- [x] 4.5 於 `middleware/auth.global.ts` 加入 `flattenRouteFeatureFlags()` 比對，disabled 時導向 `/dashboard`（比照既有權限不足的處理方式）

## 5. 驗證

- [x] 5.1 `pnpm lint` 通過
- [x] 5.2 手動驗證：預設環境（未設定任何 `FEATURE_*` 變數）下，`auditLog`、`loginLog` 兩模組皆正常運作
- [x] 5.3 手動驗證：設定 `FEATURE_AUDIT_LOG_ENABLED=false` 並重啟 `pnpm dev`，確認稽核紀錄導覽項目消失、直接訪問 `/admin/logs/audit` 被導向 `/dashboard`、`GET /api/admin/logs/audit` 回傳功能停用錯誤
- [x] 5.4 手動驗證：同上情境下，登入紀錄模組不受影響，`/admin/logs/login` 正常顯示資料
- [x] 5.5 手動驗證：`FEATURE_AUDIT_LOG_ENABLED=false` 時，調整使用者角色（`PATCH /api/admin/users/:id`）仍正常成功，不因稽核紀錄寫入被關閉而失敗
- [x] 5.6 手動驗證：設定 `FEATURE_LOGIN_LOG_ENABLED=false` 並重啟，確認登入流程本身不受影響、登入紀錄頁面與 API 皆不可用
