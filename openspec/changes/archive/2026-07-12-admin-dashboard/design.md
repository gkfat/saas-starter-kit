## Context

目前已有：

- `pages/iam/roles/index.vue`：角色列表頁（已存在，需確認是否整合或保留）
- `composables/usePermission.ts`：permission 檢查 composable
- RBAC 完整實作於後端

Admin Dashboard 需要一套獨立的 layout 與路由，與一般使用者頁面區隔。

## Goals / Non-Goals

**Goals:**

- Admin layout 含側邊欄（會員管理、角色管理、登入紀錄、Audit Log）
- 路由守衛：`admin:access` permission 驗證，無權限 redirect 到 `/`
- 四個核心頁面：users、roles、login logs、audit logs
- 後端補齊 logs 查詢 API（admin 限定）
- Superadmin 可見所有功能；admin 依 permissions 顯示

**Non-Goals:**

- Log 搜尋 / 篩選（基本列表即可）
- 角色動態新增 / 編輯 permissions（展示靜態列表）
- 會員新增功能（僅查看 + 編輯 role）
- Pagination 實作（展示用途，數量有限）

## Decisions

### 1. 使用獨立 Admin layout

`layouts/admin.vue`，與 `layouts/default.vue` 分開，避免側邊欄污染一般頁面。
頁面透過 `definePageMeta({ layout: 'admin' })` 套用。

### 2. 路由守衛實作在 `middleware/auth.global.ts`

擴充現有 global middleware，加入 `/admin/*` path 判斷，檢查 `usePermission('admin:access')`。
不新增獨立 route middleware，保持集中管理。

### 3. Superadmin / Admin UI 差異用 `usePermission` composable 控制

前端透過 `usePermission` 判斷是否顯示特定操作（如 superadmin 才能刪除 role）。
不做兩套完整 UI，只在必要位置用 `v-if` 條件渲染。

### 4. logs 查詢 API 限定 admin 角色

`GET /api/admin/logs/*` 在 handler 層檢查 `hasPermission(ctx, 'admin:access')`，非 admin 回 403。

## Risks / Trade-offs

- [現有 IAM 頁面] `pages/iam/roles/` 已存在 → 確認是否移入 admin dashboard 或保持獨立
- [Logs 資料量] 展示用途不實作 pagination，大量資料時可能慢 → 接受，展示環境可控
- [前端 permission 依賴] UI 差異依賴後端注入的 permissions，需確認 composable 正確讀取

## Migration Plan

1. 建立 `layouts/admin.vue`
2. 擴充 `middleware/auth.global.ts` 加入 admin 路由守衛
3. 建立 `pages/admin/` 各頁面（由簡入繁：index → users → roles → logs）
4. 新增 `server/api/admin/logs/` API handlers
5. 確認 `usePermission` composable 整合正確
