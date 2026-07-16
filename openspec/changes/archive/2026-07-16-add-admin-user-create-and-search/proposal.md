## Why

目前管理端只能「調整既有使用者角色」，無法直接建立使用者，也缺乏對應的細粒度權限管控；使用者列表僅支援前端關鍵字過濾，缺乏正式查詢與資料匯出能力，不利於管理端日常操作與稽核。

## What Changes

- 新增管理端「建立使用者」功能：具備 `users:create` 權限的管理者可於 `/admin/users` 直接建立新使用者（設定 username、displayName、email/phone 選填、初始角色），系統建立 Firestore `users` 文件並指派角色。
- 新增 RBAC 權限 `users:create`，預設授予 `admin` 角色；`member` 角色不具備。
- 使用者列表頁（`/admin/users`）新增伺服器端查詢（依 username / email / role 篩選）與匯出功能（將目前篩選結果匯出為 CSV）。
- 管理端建立使用者後，系統會產生一組一次性「設定密碼連結」，管理者可複製並轉交給該使用者；使用者點擊連結後可設定密碼並自動導向登入頁。
- 使用者列表新增「帳號狀態」欄位（已啟用／已停用／尚未變更預設密碼）與「最近登入時間」欄位；管理者可於操作欄停用/啟用使用者帳號，並可為「尚未變更預設密碼」的使用者重新產生一次性設定密碼連結。
- 新增 RBAC 權限 `users:delete`（獨立於 `users:write`），預設授予 `admin` 角色；`member` 角色不具備。具備此權限的管理者可於操作欄刪除「已停用」的使用者（永久刪除 Firebase Auth 帳號與 Firestore 文件），僅「已停用」狀態的使用者會顯示刪除按鈕。

## Capabilities

### New Capabilities

（無新增獨立能力，本次變更皆為既有能力之需求擴充）

### Modified Capabilities

- `rbac`: 新增 `users:create`、`users:delete` 權限，並更新 `admin` 角色的預設權限清單
- `admin-dashboard`: 使用者管理頁新增「建立使用者」對話框（含角色選擇，需 `users:create` 權限）；查詢改為呼叫後端篩選 API；新增「匯出 CSV」操作；新增帳號狀態／最近登入時間欄位；新增停用/啟用與重新產生設定密碼連結操作；新增刪除操作（僅已停用使用者顯示，需 `users:delete` 權限）

## Impact

- **前端**：`pages/admin/users/index.vue`（新增建立使用者對話框、查詢欄位、匯出按鈕、顯示設定密碼連結、帳號狀態與最近登入時間欄位、停用/啟用按鈕、重新產生連結按鈕、刪除按鈕與確認 dialog）；新增 `pages/auth/set-password.vue`（設定密碼頁）；`middleware/auth.global.ts` 的 `PUBLIC_ROUTES` 需納入該頁面
- **後端**：新增 `server/api/admin/users/index.post.ts`（建立使用者，回應含 `setupLink`）、`server/api/admin/users/index.get.ts` 擴充查詢參數與回應欄位（`disabled`、`passwordSetupPending`、`lastLoginAt`）、新增匯出邏輯（沿用既有查詢結果，前端或後端產生 CSV）、新增 `server/api/auth/set-password.post.ts`（消費一次性 token、設定密碼）、擴充 `server/api/admin/users/[id].patch.ts` 支援 `disabled` 欄位、新增 `server/api/admin/users/[id]/setup-link.post.ts`（重新產生一次性連結）、新增 `server/api/admin/users/[id].delete.ts`（刪除使用者，僅限已停用帳號）
- **模組**：`server/modules/users`（新增 `createUserByAdmin` 類 service 方法、查詢條件、`passwordSetupPending`/`lastLoginAt` 欄位與更新邏輯、刪除使用者邏輯）、`server/modules/roles`（新增刪除 `user_roles` 文件的函式）、`server/modules/auth`（新增合併查詢 Firebase Auth 帳號狀態的函式）、`shared/permissions.ts`、`shared/roles.ts`（新增/調整權限）、新增 `server/modules/password-setup`（token 產生/驗證/消費，Firestore collection `password_setup_tokens`）
- **RBAC**：`role_permissions` seed 資料需補上 `admin` → `users:create`、`users:delete` 對應（`scripts/seed-rbac.ts`）
- **i18n**：新增建立使用者對話框、查詢欄位、匯出按鈕、設定密碼頁、帳號狀態/最近登入時間/停用啟用/重新產生連結/刪除相關文案（zh/en）
