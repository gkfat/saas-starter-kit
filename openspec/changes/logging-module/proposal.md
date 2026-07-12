## Why

Phase 4 (users module) 已完成但 `audit_logs` 寫入尚未實作；`login_logs` 雖已有寫入但未走統一的 `modules/logs/` 路徑。目前各模組自行處理 log，缺乏集中管理，違反架構規範。本 change 建立統一 logging 模組，補齊所有 Firestore log 寫入。

## What Changes

- 新增 `modules/logs/`（service、repo、schema、types、index）
- 定義 `BaseLog` schema，`AuditLog` 與 `LoginLog` 繼承
- logs repo 實作（`audit_logs`、`login_logs` Firestore 寫入）
- 補齊 Phase 4 遺留：users service 呼叫 logs service 寫入 `audit_log`
- 確認 Phase 2 login_logs 寫入符合 `BaseLog` 格式並改走 `modules/logs/`
- 確認 `02.logging.ts` API log 輸出符合 GCP Structured Logging 格式

## Capabilities

### New Capabilities

- `logs-module`: 統一 log 格式與 Firestore 寫入，涵蓋 audit_log、login_log schema 與 logs module 完整實作

### Modified Capabilities

- `logging`: 補充 AuditLog、LoginLog 完整 type definition；明確各模組呼叫 logs service 的規範

## Impact

- **新增檔案**: `server/modules/logs/` 全套
- **修改**: `server/modules/users/users.service.ts`（補 audit_log 寫入）
- **修改**: `server/modules/auth/auth.service.ts`（login_log 改走 modules/logs/）
- **驗證**: `server/middleware/02.logging.ts` GCP Structured Logging 格式
- **依賴**: 無新增外部套件
