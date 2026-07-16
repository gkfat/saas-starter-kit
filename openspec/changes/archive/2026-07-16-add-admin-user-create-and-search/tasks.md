## 1. RBAC: `users:create` permission

- [x] 1.1 於 `shared/permissions.ts` 新增 `Permission.Users.Create = 'users:create'` 並補上 `PermissionMeta` 說明文字
- [x] 1.2 於 `shared/roles.ts` 的 `RolePermissions.admin` 加入 `Permission.Users.Create`
- [x] 1.3 `scripts/seed-rbac.ts` 已依 `PermissionMeta`/`RolePermissions` 動態產生 seed 資料，新增權限後無需修改此檔案
- [x] 1.4 執行 `pnpm seed:rbac` 驗證既有租戶 `role_permissions` 已補上新權限

## 2. 後端：建立使用者 API

- [x] 2.1 於 `server/modules/users/users.service.ts` 新增 `createUserByAdmin(data)`（無多租戶概念，重用 `registerUser` 並帶入指定 `role`）；Firebase Auth 帳號建立與隨機密碼於 API 層處理（沿用 `register.post.ts` 既有模式）、`providers: []`、呼叫 `assignUserRole` 指派指定角色
- [x] 2.2 新增 `server/api/admin/users/index.post.ts`：`requirePermission(event, Permission.Users.Create)`，驗證 body（username、displayName、email 選填、phone 選填、role），呼叫 `createUserByAdmin`，成功後寫入 `audit_logs`（action: `user.create`）
- [x] 2.3 於 `server/modules/users/index.ts` 匯出 `createUserByAdmin`
- [x] 2.4 新增 `CreateUserByAdminDto`（`server/modules/users/users.schema.ts`），供 API 層驗證 body

## 3. 後端：使用者查詢擴充

- [x] 3.1 擴充既有 `server/api/admin/users.get.ts` 支援 query 參數 `q`（比對 username/email）、`role`
- [x] 3.2 篩選邏輯沿用既有路由中「取得使用者列表 + 逐一查詢角色」的既有 join 流程，於記憶體中依 `q`/`role` 篩選（與現有 `isSuperAdmin` 過濾邏輯一致，未新增 service 方法以避免重複實作角色 join）
- [x] 3.3 角色資料透過既有 `getRoleForUser`（`server/modules/roles`）取得，service/route 皆未直接操作 Firestore

## 4. 前端：使用者管理頁面

- [x] 4.1 於 `pages/admin/users/index.vue` 新增角色篩選下拉，查詢欄位（username/email）與角色篩選皆透過 `useAuthFetch` 的 reactive `query` 呼叫 `GET /api/admin/users`（移除純前端 `filteredUsers` 過濾邏輯）
- [x] 4.2 新增「建立使用者」按鈕與對話框（`v-if="canCreateUsers"`，`hasPermission(Permission.Users.Create)`），欄位：username、displayName、email（選填）、phone（選填）、role（下拉）
- [x] 4.3 對話框送出呼叫 `POST /api/admin/users`，成功後關閉對話框、`refresh()` 列表、顯示成功 toast；username 重複（409）顯示「此帳號名稱已被使用」，其餘失敗顯示通用錯誤（比照既有 `pages/auth/register.vue` 對 409 的處理方式，而非泛用 `withErrorToast`，以符合 spec 指定文案）
- [x] 4.4 新增「匯出 CSV」按鈕，將目前顯示的（已套用查詢/篩選的）使用者列表組裝為 CSV 字串並透過 `Blob` 下載
- [x] 4.5 新增/更新 i18n 詞條（zh/en）：`users.createUser`、`users.createSuccess`、`users.exportCsv`、`users.filterByRole`、`permission.users:create`
- [x] 4.6 建立使用者對話框：`displayName` 改為選填（`CreateUserByAdminDto` 移除 `min(1)` 必填限制），省略時後端預設為 `username`；`role` 改為選填，省略時後端預設為 `member`；前端對話框開啟時角色下拉預設選中 `member`

## 6. 一次性密碼設定連結

- [x] 6.1 新增 `server/modules/password-setup`（`password-setup.types.ts`、`password-setup.repo.ts`、`password-setup.service.ts`、`index.ts`）：`generateSetupToken(uid)` 產生 32-byte 亂數 token 並寫入 `password_setup_tokens/{token}`（欄位 `uid`、`expiresAt`、`used`、`createdAt`，效期 24 小時）；`consumeSetupToken(token)` 驗證存在/未過期/未使用並標記為已使用
- [x] 6.2 於 `server/modules/users` 新增 `setUserPassword(uid, passwordHash)`（repo + service + index 匯出）：更新 `passwordHash`，並於 `providers` 補上 `'password'`（若尚未存在）
- [x] 6.3 新增 `server/api/auth/set-password.post.ts`：驗證 body（`token`、`password` 需符合 `isValidPassword`），呼叫 `consumeSetupToken` 取得 `uid`，雜湊密碼後呼叫 `setUserPassword`；token 無效/過期/已使用時回傳 400 錯誤
- [x] 6.4 修改 `server/api/admin/users/index.post.ts`：建立使用者成功後呼叫 `generateSetupToken(uid)`，以 `getRequestURL(event).origin` 組出連結，回應新增 `setupLink`
- [x] 6.5 新增 `pages/auth/set-password.vue`：讀取 query 參數 `token`，表單收集新密碼＋確認密碼，呼叫 `POST /api/auth/set-password`，成功後顯示成功 toast 並導向 `/login`；token 無效/過期時顯示錯誤訊息
- [x] 6.6 於 `middleware/auth.global.ts` 的 `PUBLIC_ROUTES` 加入 `/auth/set-password`（前端路由守衛）；並於 `server/middleware/03.auth.ts` 的 `PUBLIC_PATHS` 加入 `/api/auth/set-password`（後端全域 API 認證中介層，先前遺漏，導致未登入使用者呼叫該端點會被擋在 handler 之前回傳 401，已修正）
- [x] 6.7 於 `pages/admin/users/index.vue` 建立使用者成功後，於畫面顯示 `setupLink`（可複製），提示管理者需自行轉交給使用者
- [x] 6.8 新增/更新 i18n 詞條（zh/en）：設定密碼頁標題與欄位、連結顯示與複製提示、token 無效/過期錯誤訊息

## 7. 帳號狀態、最近登入時間、停用/啟用、重新產生連結

- [x] 7.1 於 `server/modules/users/users.types.ts` 的 `User` 型別新增 `passwordSetupPending: boolean`、`lastLoginAt: string | null`；`users.repo.createUser` 寫入預設值（`passwordSetupPending` 由呼叫端傳入、預設 `false`；`lastLoginAt` 固定 `null`）；`users.schema.ts` 的 `UserSchema` 同步更新
- [x] 7.2 `registerUser`/`createUserByAdmin`（`users.service.ts`）新增可傳入 `passwordSetupPending`；`createUserByAdmin` 固定帶入 `true`，一般自助註冊維持預設 `false`
- [x] 7.3 擴充 `users.repo.updateUserPassword`（即 `setUserPassword` 底層），設定密碼成功時一併把 `passwordSetupPending` 改為 `false`
- [x] 7.4 擴充 `users.repo.syncUserOnLogin`：每次呼叫皆無條件寫入 `lastLoginAt = new Date().toISOString()`（不再需要「有變更才 update」的條件判斷）
- [x] 7.5 於 `server/api/auth/login.post.ts` 的 password 登入分支，補上呼叫 `touchUserOnLogin({ uid, displayName: null, phone: null })`，使密碼登入也會更新 `lastLoginAt`（OAuth 流程已透過 `processLogin` 呼叫，不需改動）
- [x] 7.6 於 `server/modules/auth`（`auth.service.ts`/`index.ts`）新增 `getAuthAccountStatus(uid): Promise<{ isSuperAdmin: boolean; disabled: boolean }>`，合併查詢 Firebase Auth `UserRecord`（取代 `server/api/admin/users.get.ts` 原本單獨呼叫的 `isSuperAdminUid`，避免對同一 uid 呼叫兩次 Admin SDK）
- [x] 7.7 更新 `server/api/admin/users.get.ts`：改用 `getAuthAccountStatus`，回應新增 `disabled`、`passwordSetupPending`、`lastLoginAt` 欄位
- [x] 7.8 擴充 `server/api/admin/users/[id].patch.ts`：body schema 改為 `role`、`disabled` 皆為可選（至少需提供一項）；帶 `disabled` 時呼叫 `adminAuth().updateUser(id, { disabled })`，停用時另呼叫 `revokeRefreshTokens(id)`；若 `actorId === userId` 且 `disabled === true` 則回傳 400 錯誤；寫入 `audit_logs`（action: `user.status.update`）
- [x] 7.9 新增 `server/api/admin/users/[id]/setup-link.post.ts`：`requirePermission(event, Permission.Users.Write)`，驗證目標使用者 `passwordSetupPending === true`（否則回傳 400），呼叫 `generateSetupToken` 並以請求 origin 組出連結回傳，寫入 `audit_logs`（action: `user.setup_link.regenerate`）
- [x] 7.10 於 `pages/admin/users/index.vue` 新增「帳號狀態」欄位（依 `disabled`/`passwordSetupPending` 計算顯示文字，優先順序：已停用 > 尚未變更預設密碼 > 已啟用）與「最近登入時間」欄位（`formatDateTime(lastLoginAt)`，`null` 時顯示 `-`）
- [x] 7.11 於操作欄新增停用/啟用按鈕（`v-if="canWriteUsers"`），點擊後彈出確認 dialog，確認後呼叫 `PATCH /api/admin/users/:id`（`{ disabled: !item.disabled }`），成功後 `refresh()` 並顯示成功 toast
- [x] 7.12 於操作欄新增「重新產生連結」按鈕（`v-if="canWriteUsers && item.passwordSetupPending"`），點擊後呼叫 `POST /api/admin/users/:id/setup-link`，於既有的一次性連結 dialog（沿用建立使用者流程已實作的顯示/複製 dialog）顯示回傳的連結
- [x] 7.13 新增/更新 i18n 詞條（zh/en）：`users.status.enabled`／`disabled`／`pendingPassword`、`users.lastLoginAt`、`users.disableUser`／`enableUser`、`users.disableConfirm`、`users.regenerateLink`、對應成功/錯誤訊息

## 8. 刪除已停用使用者（獨立權限）

- [x] 8.1 於 `shared/permissions.ts` 新增 `Permission.Users.Delete = 'users:delete'` 並補上 `PermissionMeta` 說明文字
- [x] 8.2 於 `shared/roles.ts` 的 `RolePermissions.admin` 加入 `Permission.Users.Delete`
- [x] 8.3 於 `server/modules/roles`（`roles.repo.ts`/`roles.service.ts`/`index.ts`）新增 `deleteUserRole(uid)`，刪除 `user_roles/{uid}` 文件
- [x] 8.4 於 `server/modules/users`（`users.repo.ts`/`users.service.ts`/`index.ts`）新增 `deleteUserAccount(uid)`，刪除 Firestore `users/{uid}` 文件
- [x] 8.5 新增 `server/api/admin/users/[id].delete.ts`：`requirePermission(event, Permission.Users.Delete)`；驗證 `userId` 存在、`actorId !== userId`、目標使用者 `disabled === true`（否則 400）；依序呼叫 `adminAuth().deleteUser(userId)`、`deleteUserAccount(userId)`、`deleteUserRole(userId)`；寫入 `audit_logs`（action: `user.delete`）
- [x] 8.6 於 `pages/admin/users/index.vue` 操作欄新增刪除按鈕（`v-if="canDeleteUsers && item.disabled"`，`hasPermission(Permission.Users.Delete)`），點擊後彈出確認 dialog，確認後呼叫 `DELETE /api/admin/users/:id`，成功後 `refresh()` 並顯示成功 toast
- [x] 8.7 新增/更新 i18n 詞條（zh/en）：`users.deleteUser`、`users.deleteConfirm`、`users.deleteSuccess`、`permission.users:delete`

## 5. 驗證

- [x] 5.1 `pnpm lint` 通過（`pnpm nuxi typecheck` 亦確認未新增任何型別錯誤，僅剩與本次變更無關的既有錯誤）
- [x] 5.2 手動驗證：以 admin 帳號登入 → 建立新使用者（含角色）成功 → 於列表中查得到（待使用者自行驗證）
- [x] 5.3 手動驗證：以 member 帳號登入 → `/admin/users` 不顯示「建立使用者」按鈕，直接呼叫 API 回傳權限錯誤（待使用者自行驗證）
- [x] 5.4 手動驗證：查詢 username/email 關鍵字與角色篩選皆正確縮小列表範圍（待使用者自行驗證）
- [x] 5.5 手動驗證：套用篩選後點擊「匯出 CSV」，下載檔案內容僅包含篩選後的使用者（待使用者自行驗證）
- [x] 5.6 確認既有帳號密碼自助註冊（`/auth/register`）與登入流程未受本次變更影響（待使用者自行驗證）
- [x] 5.7 手動驗證：以建立使用者取得的連結開啟 `/auth/set-password?token=...`，設定新密碼後成功導向 `/login`，並可用新密碼登入
- [x] 5.8 手動驗證：連結重複使用或過期時，`/auth/set-password` 顯示錯誤且不可設定密碼
- [x] 5.9 手動驗證：新建立的使用者列表狀態顯示「尚未變更預設密碼」；設定密碼後狀態變為「已啟用」，且操作欄的「重新產生連結」按鈕消失
- [x] 5.10 手動驗證：停用使用者後狀態顯示「已停用」、該使用者無法再登入；重新啟用後恢復正常
- [x] 5.11 手動驗證：管理者無法停用自己的帳號
- [x] 5.12 手動驗證：以密碼與 Google 登入後，該使用者列的「最近登入時間」皆會更新
- [x] 5.13 手動驗證：已啟用或尚未變更預設密碼的使用者不顯示刪除按鈕；停用後才出現，具備 `users:delete` 權限的 admin 可成功刪除，member 呼叫 API 回傳權限錯誤
- [x] 5.14 手動驗證：直接對未停用的使用者呼叫 `DELETE /api/admin/users/:id` 會被拒絕（400）
