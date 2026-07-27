## Context

現況（詳見 `openspec/specs/admin-dashboard/spec.md` §"User management page lists and filters users"）：

- 單一頁面 `pages/admin/users/index.vue`，透過 `GET /api/admin/users?q=&role=` 取得清單，`role` 目前為可選篩選。
- 過濾邏輯全部集中在 `server/api/admin/users.get.ts` handler 內：先呼叫 `getAllUsers()`（`server/modules/users/`，repo 層無角色過濾），再逐筆查 `getAuthAccountStatus(uid)` 排除 superadmin，最後依 `q` / `role` 做記憶體內過濾。
- 權限守衛：頁面級用 `Permission.Users.Read` 顯示選單與頁面；`Users.Write/Create/Delete` 控制按鈕顯示與對應 API。
- 角色定義只有三種：`superadmin`（Firebase custom claim，非 Firestore 資料）、`admin`、`member`（皆為 Firestore `user_roles` 文件）。
- 選單設定集中在 `config/app-routes.ts`，由 `AppDrawer.vue` 依 `hasPermission(item.permission)` 過濾渲染。

## Goals / Non-Goals

**Goals:**

- 將「使用者」選單拆為「會員管理」「後台帳號管理」兩個獨立選單項目與頁面路由。
- 兩頁面各自擁有獨立權限（`members:*` / `admin-accounts:*`），可分別授權、互不影響。
- 後端仍用同一支 `GET /api/admin/users`，依 `role` 必要參數決定回傳範圍，不新增重複的 repo/service 邏輯。
- 共用既有 table / dialog UI 元件，避免重複實作 CRUD 互動邏輯。

**Non-Goals:**

- 不改變 Firestore 資料結構（`user_roles`、`role_permissions` schema 不變）。
- 不新增新角色（仍只有 `superadmin` / `admin` / `member`）。
- 不處理未來多角色分類（例如「member 底下再分等級」）——僅二元拆分 member vs non-member。
- 不改動 `POST /api/admin/users`（建立使用者）、`PATCH /api/admin/users/:id`、`DELETE /api/admin/users/:id`、`setup-link` 的商業邏輯，僅調整其權限守衛依賴的 permission 名稱。

## Decisions

### 1. 權限模型：新增 `members:*` 與 `admin-accounts:*`，取代 `users:*` 作為頁面級授權

**決定**：新增 8 個權限常數：`members:read/write/create/delete`、`admin-accounts:read/write/create/delete`，定義於 `shared/permissions.ts`。`admin` 角色的預設 `RolePermissions` 同時包含兩組全部權限；`member` 角色兩組都不含。

**取代範圍**：原本掛在 `Permission.Users.*` 的頁面/按鈕/API 守衛，全數改掛對應新權限：

- 會員管理頁（選單、`UsersFilterBar`、CRUD 按鈕、對應 API 呼叫）→ `Permission.Members.*`
- 後台帳號管理頁 → `Permission.AdminAccounts.*`

`Permission.Users.*` 常數整組移除（無殘留使用者才移除，依 cleanup checklist 全域搜尋確認後才動手）。

**替代方案考量**：

- 沿用 `Permission.Users.*` 但靠前端路由區分——被否決，因為無法個別授權（例如某角色只能管會員、不能管後台帳號，這正是本次拆分的目的）。
- 用「一個權限 + role 子欄位」的複合權限——被否決，格式偏離現有 `resource:action` 慣例，且無實際需求要如此複雜。

### 2. API：沿用單一 `GET /api/admin/users`，`role` 改為必要參數，並限定合法值

**決定**：`server/api/admin/users.get.ts` 的 query schema 將 `role` 從 `.optional()` 改為必要欄位，值域限定為 `'member'`（會員管理頁使用）或 `'non-member'`（後台帳號管理頁使用，語意為「排除 member 與 superadmin 的所有角色」，非字面上的 Firestore role 名稱）。Handler 內的過濾邏輯：

```ts
const isMember = user.role === Role.Member;
if (role === 'member') return isMember;
if (role === 'non-member') return !isMember; // superadmin 已在前面統一排除
```

superadmin 排除邏輯不變（維持現有 `!user.isSuperAdmin` 過濾，發生在 role 過濾之前）。

`requirePermission` 依 `role` 參數值分派：

```ts
requirePermission(
  event,
  role === 'member' ? Permission.Members.Read : Permission.AdminAccounts.Read,
);
```

**替代方案考量**：拆成兩支獨立 endpoint（`/api/admin/members`、`/api/admin/admin-accounts`）——經與使用者確認，選擇不拆，因為底層資料來源、欄位、分頁/搜尋邏輯完全相同，拆兩支 endpoint 只是重複同一段程式碼；用一支 endpoint + 必要 role 參數即可達到「依頁面決定回傳範圍與權限」的目的，改動也更小。

### 3. 前端：兩個頁面目錄，共用既有元件

**決定**：

- 新建 `pages/admin/members/index.vue`、`pages/admin/admin-accounts/index.vue`，各自呼叫 `useAuthFetch('/api/admin/users', { query: { role: 'member' | 'non-member', q } })`，並各自用 `hasPermission(Permission.Members.*)` / `hasPermission(Permission.AdminAccounts.*)` 決定按鈕顯示。
- 既有 `pages/admin/users/components/*.vue`（`UsersTable`、`UsersFilterBar`、`UsersToolbar`、`CreateUserDialog`、`EditRoleDialog`、`ToggleStatusDialog`、`DeleteUserDialog`、`SetupLinkDialog`）搬移至共用位置（例如 `components/admin/users/`），供兩個頁面 import，避免複製貼上兩份。
- `UsersFilterBar` 的角色下拉選單（原本讓使用者在 member/admin 間切換）於兩個新頁面移除——角色範圍已由頁面本身決定，不需要再讓使用者手動篩選 member/admin。
- 移除 `pages/admin/users/` 整個目錄與 `/admin/users` 路由。

### 4. 選單：`config/app-routes.ts` 新增兩個項目取代原本的 `nav.adminUsers`

**決定**：

```ts
{ title: 'nav.members', icon: 'mdi-account-multiple', path: '/admin/members', permission: Permission.Members.Read },
{ title: 'nav.adminAccounts', icon: 'mdi-account-tie', path: '/admin/admin-accounts', permission: Permission.AdminAccounts.Read },
```

新增對應 i18n key（`nav.members`、`nav.adminAccounts`）於 `i18n/locales/zh-TW.json`（及其他語系檔，若存在）。

### 5. 建立使用者對話框：依頁面固定/限制可選角色

**決定**：

- 會員管理頁的「建立使用者」對話框角色欄位固定為 `member`，不提供角色選單（原本預設 `member` 的行為維持，但改為不可變更）。
- 後台帳號管理頁的「建立使用者」對話框角色欄位僅列出非 `member` 的角色（目前即 `admin`），預設 `admin`。

理由：避免在「會員管理」頁建出 `admin` 帳號、或在「後台帳號管理」頁建出 `member` 帳號，維持兩頁面「管理範圍」與「可建立範圍」一致，符合本次拆分的初衷。

## Risks / Trade-offs

- **[Risk]** `role` query 由可選變必要，屬於 breaking API 變更，若有其他呼叫端（目前僅前端頁面）遺漏更新會直接 400 → **Mitigation**：全域搜尋 `/api/admin/users` 呼叫點（cleanup checklist），確認只有兩個新頁面呼叫，且皆已帶上必要參數。
- **[Risk]** `Permission.Users.*` 移除後若有遺漏引用會造成編譯錯誤或執行期權限誤判 → **Mitigation**：依 cleanup checklist 全域搜尋確認 0 引用後才刪除；型別編譯 (`pnpm build`) 會攔截遺漏的引用。
- **[Risk]** 既有 `admin` 角色使用者若未同步取得新權限（`role_permissions` 資料為 Firestore 既有資料，非程式碼常數），可能出現「舊資料庫沒有新權限記錄」導致 admin 突然看不到任一頁面 → **Mitigation**：tasks.md 需包含資料遷移/seed 步驟，將現有 `admin` 角色的 `role_permissions` 補上 `members:*` 與 `admin-accounts:*`（比照 superadmin-seed 的做法）。

## Migration Plan

1. 後端新增權限常數與角色對照 → 更新既有 Firestore `role_permissions` 資料（為既有 `admin` 角色補上新權限；此為一次性 seed/migration script 或手動 Firestore console 操作，視現有 seed 機制而定）。
2. 調整 `GET /api/admin/users` 的 query 驗證與過濾邏輯（先支援必要 `role`，暫時保留舊有可選行為的相容期不需要——demo 專案無需灰度）。
3. 前端搬移共用元件、新增兩個頁面、更新選單與 i18n。
4. 移除 `pages/admin/users/`、`Permission.Users.*` 及所有殘留引用。
5. 更新 `openspec/specs/{admin-dashboard,rbac,admin-shell}/spec.md`（透過 `openspec-apply-change` 完成實作後，用 `openspec-sync-specs` 同步）。

無需 rollback 特殊設計（demo 專案、非正式上線環境）；如需回退，直接 revert commit 並還原 Firestore `role_permissions` 手動變更。

## Open Questions

- 現有 `admin` 角色在 Firestore `role_permissions` 的補權限，是走既有的 seed script（若有）還是手動處理？需在 `openspec-apply-change` 階段確認專案內是否已有類似 `superadmin-seed` 的角色初始化機制可複用。
