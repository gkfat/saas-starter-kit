## 1. 權限與角色資料

- [x] 1.1 於 `shared/permissions.ts` 新增 `Permission.Members.{Read,Write,Create,Delete}` 與 `Permission.AdminAccounts.{Read,Write,Create,Delete}` 常數
- [x] 1.2 於 `shared/roles.ts` 更新 `RolePermissions`：`admin` 角色包含全部 8 個新權限；`member` 角色不含任何一個
- [x] 1.3 既有 `scripts/seed-rbac.ts` 會依 `RolePermissions`/`PermissionMeta` 全量覆寫 Firestore `role_permissions`/`permissions` 文件（`batch.set`），無需新增遷移腳本；部署後重新執行 `pnpm seed:rbac` 即可讓既有環境的 `admin` 角色取得新權限
- [x] 1.4 全域搜尋 `Permission.Users` 用量，確認 7 處引用點（`config/app-routes.ts`、`server/api/admin/users.get.ts`、`server/api/admin/users/index.post.ts`、`server/api/admin/users/[id].patch.ts`、`server/api/admin/users/[id]/setup-link.post.ts`、`server/api/admin/users/[id].delete.ts`、`server/api/dashboard/stats.get.ts`、`pages/admin/users/index.vue`）已列出，於第 2-5 節逐一改用新權限

## 2. 後端 API

- [x] 2.1 修改 `server/api/admin/users.get.ts` 的 query schema：`role` 由 `.optional()` 改為必要欄位，值限定為 `'member' | 'non-member'`
- [x] 2.2 修改過濾邏輯：`role === 'member'` 回傳 `user.role === Role.Member`；`role === 'non-member'` 回傳 `!isMember`（superadmin 排除邏輯維持不變、且發生在此過濾之前）
- [x] 2.3 修改 `requirePermission` 呼叫：依 `role` 參數值分派 `Permission.Members.Read` 或 `Permission.AdminAccounts.Read`
- [x] 2.4 修改 `PATCH /api/admin/users/:id`（啟用/停用、變更角色）、`POST /api/admin/users/:id/setup-link`、`DELETE /api/admin/users/:id` 的 `requirePermission` 呼叫：依目標使用者「變更前」的角色（member vs non-member）分派對應的 `*:write` / `*:delete` 權限
- [x] 2.5 修改 `POST /api/admin/users`（建立使用者）：依請求 body 的 `role`（未提供時預設 `member`）分派 `Permission.Members.Create` 或 `Permission.AdminAccounts.Create`；權限檢查本身即保證會員管理頁（僅送出 `member`）與後台帳號管理頁（僅送出非 `member`）各自需要對應權限
- [x] 2.6（新增，非原始清單）`server/api/dashboard/stats.get.ts` 統計橫跨全部角色，原用 `Permission.Users.Read`，改為同時要求 `Permission.Members.Read` 與 `Permission.AdminAccounts.Read`

## 3. 前端共用元件

- [x] 3.1 將 `pages/admin/users/components/*.vue` 以 `git mv` 搬移至共用目錄 `components/users/`（供兩個新頁面以明確 import 共用，維持與現有專案「顯式 import 元件」風格一致）
- [x] 3.2 修改 `UsersFilterBar.vue`：移除角色篩選下拉選單（角色範圍已由頁面固定），僅保留關鍵字搜尋
- [x] 3.3 修改 `CreateUserDialog.vue`：新增 `mode: 'member' | 'admin-account'` prop，`member` 模式隱藏角色欄位並固定送出 `member`；`admin-account` 模式僅列出非 member 角色選單並預設第一個可選角色（現況即 `admin`）

## 4. 前端頁面與選單

- [x] 4.1 新建 `pages/admin/members/index.vue`：呼叫 `GET /api/admin/users?role=member`，使用共用元件，依 `Permission.Members.*` 控制按鈕顯示
- [x] 4.2 新建 `pages/admin/admin-accounts/index.vue`：呼叫 `GET /api/admin/users?role=non-member`，使用共用元件，依 `Permission.AdminAccounts.*` 控制按鈕顯示
- [x] 4.3 更新 `config/app-routes.ts`：移除 `nav.adminUsers` 項目，新增「會員管理」(`/admin/members`, `Permission.Members.Read`) 與「後台帳號管理」(`/admin/admin-accounts`, `Permission.AdminAccounts.Read`) 兩個項目
- [x] 4.4 更新 `i18n/locales/{zh-TW,en}.json`：新增 `nav.members`、`nav.adminAccounts`、`users.memberPageTitle`、`users.adminAccountPageTitle`；移除不再使用的 `nav.adminUsers`、`users.title`、`users.filterByRole`；同步更新 `permission.*`（`users:*` → `members:*` / `admin_accounts:*`）供 `EditRoleDialog` 權限標籤顯示

## 5. 清理舊有程式碼

- [x] 5.1 刪除 `pages/admin/users/` 整個目錄（含子元件目錄，元件已於 3.1 搬移）
- [x] 5.2 所有 `Permission.Users.*` 引用已改為對應新權限，`Permission.Users.*` 常數本身已隨 1.1 直接以 `Permission.Members.*` / `Permission.AdminAccounts.*` 取代（全域搜尋確認 0 殘留）
- [x] 5.3 全域搜尋確認無殘留對 `/admin/users` 前端路由、`nav.adminUsers`、`users:*` 權限字串的引用（`/api/admin/users` 後端 endpoint 路徑不變，非移除對象）

## 6. 驗證

- [x] 6.1 `pnpm lint` 通過；`pnpm build` 因本機已有 `pnpm dev` 佔用而無法執行（未經使用者同意不 kill 既有 process），改跑 `npx nuxi typecheck`：僅 2 個既有型別錯誤（`nuxt.config.ts`、`server/api/auth/google-register.post.ts`），皆與本次變更檔案無關（`git diff` 確認未觸碰），本次改動的檔案無新增型別錯誤
- [x] 6.2 手動驗證（留給使用者執行）：`admin` 角色可分別進出 `/admin/members` 與 `/admin/admin-accounts`，兩頁清單互不包含對方角色與 superadmin。**前置**：需先執行 `pnpm seed:rbac` 讓既有 `admin`/`member` 角色取得新權限，再以 `admin@demo.com` / `demo1234`（見 `docs/setup/seed.md`）登入測試
- [x] 6.3 手動驗證（留給使用者執行）：`member` 角色（`member@demo.com` / `demo1234`）無法看到 Management 選單下的任一項目、直接呼叫對應 API 會被拒絕
- [x] 6.4 手動驗證（留給使用者執行）：兩頁面的建立使用者、啟用/停用、重新產生密碼連結、刪除功能皆正常運作
- [x] 6.5 `tests/` 目錄僅有 `rate-limit.test.ts` 一支整合測試，與 users/rbac 無關且本次未觸碰其涉及的 `server/modules/rate-limit`，無既有 users/rbac 測試可執行；未實際執行該測試（需即時 hit 線上 Firebase 專案並建立帳號，使用者已選擇跳過會觸碰 Firebase 專案的驗證步驟）

## 7. 規格同步

- [x] 7.1 執行 `openspec-sync-specs`，將本次 delta 同步回 `openspec/specs/{admin-dashboard,rbac,admin-shell}/spec.md`；同步時順手修正 delta 文件中筆誤的 `admin-accounts:*`（連字號）為程式碼實際使用的 `admin_accounts:*`（底線），以及過時的「建立使用者」按鈕文字為實際的「建立會員」/「建立管理員」
- [x] 7.2 執行 `openspec-archive-change` 歸檔此 change 至 `openspec/changes/archive/2026-07-27-split-users-into-members-and-admin-accounts/`
