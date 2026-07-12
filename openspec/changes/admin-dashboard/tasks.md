## 1. Admin Layout 與路由守衛

- [x] 1.1 建立 `layouts/admin.vue`（側邊欄：會員管理、角色管理、登入紀錄、Audit Log）
- [x] 1.2 擴充 `middleware/auth.global.ts`：`/admin/*` 路由需 `admin:access` permission，無權限 redirect 到 `/`
- [x] 1.3 建立 `pages/admin/index.vue`（Dashboard 首頁，套用 admin layout）

## 2. 會員管理頁

- [x] 2.1 建立 `pages/admin/users/index.vue`：users 列表（email、displayName、role、createdAt）
- [x] 2.2 實作搜尋功能（依 email 篩選）
- [x] 2.3 實作編輯 role 功能（選擇 role → 呼叫 PATCH /api/admin/users/:id）

## 3. 角色管理頁

- [x] 3.1 建立 `pages/admin/roles/index.vue`：roles 列表 + 各 role 對應 permissions
- [x] 3.2 確認是否整合或取代現有 `pages/iam/roles/index.vue`（保留 /iam/roles，admin/roles 為 admin layout 版本）

## 4. 登入紀錄頁

- [x] 4.1 新增 `server/api/admin/logs/login.get.ts`：查詢 `login_logs`，需 `admin:access`
- [x] 4.2 建立 `pages/admin/logs/login.vue`：顯示 時間、帳號、provider、result

## 5. Audit Log 頁

- [x] 5.1 新增 `server/api/admin/logs/audit.get.ts`：查詢 `audit_logs`，需 `admin:access`
- [x] 5.2 建立 `pages/admin/logs/audit.vue`：顯示 時間、操作者、動作、diff

## 6. Superadmin / Admin UI 差異

- [x] 6.1 確認 `composables/usePermission.ts` 正確讀取後端注入的 permissions
- [x] 6.2 superadmin 專屬操作（如刪除 role）加 `v-if="isSuperadmin"` 條件渲染
