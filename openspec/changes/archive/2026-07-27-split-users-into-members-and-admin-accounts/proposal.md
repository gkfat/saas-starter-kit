## Why

目前 `/admin/users` 是單一頁面，透過 role 篩選同時管理「一般會員」與「後台管理帳號」，兩種身份的管理情境（誰可以管、看哪些欄位、能做什麼操作）實際上不同，混在同一個選單與權限下，未來難以個別授權（例如某角色只能管會員、不能碰後台帳號）。將其拆分為「會員管理」與「後台帳號管理」兩個獨立選單/頁面，並各自擁有獨立權限，可讓授權粒度更精確，也讓兩種管理情境未來能各自演進而不互相牽制。

## What Changes

- 新增兩個獨立選單項目與頁面：「會員管理」(`/admin/members`) 與「後台帳號管理」(`/admin/admin-accounts`)，取代原本單一的「使用者」選單/頁面 (`/admin/users`)。**BREAKING**：`/admin/users` 路由與 `nav.adminUsers` 選單項目移除。
- 兩頁面共用既有的 table / dialog UI 元件（`UsersTable.vue` 等），僅資料來源與可用操作依權限不同。
- `GET /api/admin/users` 的 `role` query 參數由「可選篩選」改為「必要參數」，依呼叫端決定回傳範圍：
  - 會員管理頁：僅回傳角色為 `member` 的使用者（已排除 `superadmin`）
  - 後台帳號管理頁：僅回傳角色非 `member` 的使用者（如 `admin`，同樣排除 `superadmin`）
- 新增兩組獨立權限，取代原本單一的 `users:*` 權限系列作為頁面級授權依據：
  - `members:read` / `members:write` / `members:create` / `members:delete`
  - `admin-accounts:read` / `admin-accounts:write` / `admin-accounts:create` / `admin-accounts:delete`
    `admin` 角色的預設權限集需同時涵蓋兩組權限；`member` 角色不擁有任何一組。
- 建立/編輯角色/刪除/setup-link 等既有 CRUD 端點沿用不變，僅其權限守衛依所屬頁面改用對應的新權限。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `admin-dashboard`: 「User management page lists and filters users」需求拆分為兩個獨立頁面需求（會員管理／後台帳號管理），各自的 query、欄位、可用操作依權限收斂。
- `rbac`: 新增 `members:*` 與 `admin-accounts:*` 兩組權限，取代 `users:create` / `users:delete` 等既有頁面級權限的授權用途；更新 `admin` / `member` 角色的預設權限集。
- `admin-shell`: Sidebar 的 Management 群組項目由單一「Users」改為「會員管理」「後台帳號管理」兩項。

## Impact

- 前端：`pages/admin/users/` 整組目錄拆分為 `pages/admin/members/` 與 `pages/admin/admin-accounts/`，共用元件抽出或複用；`config/app-routes.ts` 選單設定；`i18n/locales/*.json` 新增對應文案。
- 後端：`server/api/admin/users.get.ts` 的 query 驗證與過濾邏輯調整（role 必填）；`shared/permissions.ts`、`shared/roles.ts` 新增權限與角色對照；其餘 `server/api/admin/users/**` 端點的 `requirePermission` 呼叫改用新權限。
- 規格：`openspec/specs/admin-dashboard/spec.md`、`openspec/specs/rbac/spec.md`、`openspec/specs/admin-shell/spec.md` 需更新對應 delta。
