## Why

目前 `login_logs` / `audit_logs` 模組沒有整體開關：無論是否需要，`recordAuditLog`/`recordLoginLog` 都會被固定呼叫並寫入 Firestore，`/admin/logs/*` 頁面與 API 也永遠存在（僅受 RBAC 權限保護）。部署到不需要記錄稽核或登入紀錄的環境時，無法整體關閉這兩個模組；也缺乏一個通用機制供未來新增的模組比照辦理。需要一個 feature flag 機制，讓 `auditLog`、`loginLog` 這兩個模組可各自獨立開關，關閉時不影響其餘功能正常運作（例如關閉 audit log 不應讓「調整使用者角色」這類會寫入稽核紀錄的操作失敗）。

## What Changes

- 新增 feature flag 機制：以環境變數控制的全域、建置期開關，前後端共用同一份設定來源
- 定義兩個模組旗標：`auditLog`、`loginLog`，預設皆為啟用（`true`），可透過環境變數個別關閉
- 關閉某模組時：
  - 對應的寫入行為（`recordAuditLog`/`recordLoginLog`）成為 no-op，呼叫端（如使用者角色調整、登入流程）不受影響、不拋出錯誤
  - 對應的管理頁面（`/admin/logs/audit`、`/admin/logs/login`）與其導覽選單項目不再顯示
  - 對應的讀取 API（`GET /api/admin/logs/audit`、`GET /api/admin/logs/login`）回傳「功能未啟用」錯誤，即使呼叫者具備讀取權限
- 每個模組的開關彼此獨立，關閉一個不影響另一個或其他既有功能（登入、RBAC、使用者管理等）

## Capabilities

### New Capabilities

- `feature-flags`: 全域模組開關機制，提供 `auditLog`、`loginLog` 兩個旗標的定義、讀取方式，以及在前後端如何依旗標啟用/停用對應模組的行為規範

### Modified Capabilities

（無既有 spec 之需求異動；`admin-dashboard` 的登入紀錄/稽核紀錄頁面需求本身不變，僅新增「模組關閉時不顯示/不可存取」的前置條件，歸類於新能力 `feature-flags` 描述）

## Impact

- **設定來源**：新增環境變數（如 `FEATURE_AUDIT_LOG_ENABLED`、`FEATURE_LOGIN_LOG_ENABLED`），於 `nuxt.config.ts` 的 `runtimeConfig.public` 曝光給前後端共用
- **共用定義**：新增 `shared/feature-flags.ts`（或等效常數檔），定義旗標鍵值，供前後端 import
- **後端**：
  - `server/modules/logs/logs.service.ts` 的 `recordAuditLog`/`recordLoginLog` 加入旗標檢查（disabled 時 no-op）
  - `server/api/admin/logs/audit.get.ts`、`server/api/admin/logs/login.get.ts` 加入旗標檢查（disabled 時回傳錯誤）
- **前端**：
  - `config/app-routes.ts` 的導覽項目新增旗標關聯，disabled 時導覽選單不顯示對應項目
  - `middleware/auth.global.ts`（或頁面層級 guard）在旗標關閉時阻擋直接以網址進入 `/admin/logs/audit`、`/admin/logs/login`
- **環境設定文件**：更新 `.env.example` 說明新增的環境變數
