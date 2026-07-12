## Why

Phase 5（logging module）完成後，Firestore 已有完整的 audit_logs 與 login_logs 資料，但目前缺乏後台管理介面。本 change 建立 Admin Dashboard，讓 admin 與 superadmin 可管理會員、角色與查看日誌。

## What Changes

- 建立 Admin layout（獨立 layout，帶側邊欄導覽）
- 路由守衛：進入 `/admin/*` 需具備 `admin:access` permission
- 會員管理頁：列表、搜尋、查看詳情、編輯 role
- 角色管理頁：roles + permissions 對應關係（動態新增待 Phase 後）
- 登入紀錄頁：`login_logs` 列表（時間、帳號、provider、結果）
- Audit Log 頁：`audit_logs` 列表（時間、操作者、動作、diff）
- 對應後端 API：`GET /api/admin/logs/audit`、`GET /api/admin/logs/login`

## Capabilities

### New Capabilities

- `admin-dashboard`: Admin 後台管理介面，涵蓋會員管理、角色管理、日誌查看

### Modified Capabilities

- `rbac`: 補充前端 UI 差異規則（superadmin 可見部分功能，admin 不可見）

## Impact

- **新增頁面**: `pages/admin/`（dashboard、users、roles、logs/login、logs/audit）
- **新增 layout**: `layouts/admin.vue`
- **新增 API**: `server/api/admin/logs/audit.get.ts`、`server/api/admin/logs/login.get.ts`
- **修改**: `middleware/auth.global.ts`（補 `/admin/*` 路由守衛）
- **依賴**: Phase 5 logging module 必須先完成
