## Why

商家真正想要的是「留住客人並提升回購率」，但目前系統只有會員身份與資料管理，沒有任何機制反映會員的長期價值或忠誠度。等級系統是會員經營平台的核心留存工具之一（呼應 `target.md` 的「點數與等級管理」），能讓商家依會員貢獻程度給予差異化待遇。此變更先建立等級模組的核心資料模型與週期評等機制；具體「指標是什麼」（消費金額、次數等）刻意留待後續呼叫端決定，以維持模組的通用性。

## What Changes

- 新增獨立的 `level` 模組（`apps/server/server/modules/level`），與既有 `points` 模組完全解耦，互不相依，各自擁有獨立的 ledger 與排程
- 新增會員等級的週期評等模型：依會員 `createdAt` 各自獨立起算的固定週期（週年制），週期到期時累積指標歸零並重新評等
- 新增等級異動明細 ledger（`level_metric_entries`，記錄呼叫端餵入的指標值）與正式評等紀錄（`level_history`，含評等當下的級距表快照）
- 新增即時升級規則：指標達標立即升級生效；降級僅發生於週期到期的正式評等，週期中途不會降級
- 新增級距表（tier thresholds）資料模型，存於 Firestore，供 admin 後台管理
- 新增 admin 後台的等級級距表管理 UI（新增/修改/刪除等級名稱與門檻）
- 新增到期評等批次邏輯，透過受保護的 internal API endpoint 觸發（由 GCP Cloud Scheduler 定期呼叫），以共享密鑰驗證呼叫來源
- 新增等級模組的 feature flag，可整體開關前後端功能
- 公開 `level` 模組 API：`recordMetric()`、`getLevel()`（供其他模組透過 `index.ts` 呼叫，不綁定特定指標語意）

不包含於本次範圍：

- 指標本身的定義與計算來源（例如消費金額、簽到次數）——由呼叫端決定，本次僅確保資料結構對任意指標中立
- 管理員手動覆蓋等級——本次不支援，若有真實需求另立 change
- `points` 模組（已存在解耦決策，非本次實作範圍）

## Capabilities

### New Capabilities

- `member-level-management`：會員等級的週期評等模型、指標記錄、等級查詢、到期批次評等、級距表治理與 feature flag 整合

### Modified Capabilities

（無現有 capability 的需求變更；本次為全新獨立模組，不修改既有 `feature-flags`、`rbac` 等 spec 的需求本身，僅依既有機制擴充使用）

## Impact

- 新增程式碼：`apps/server/server/modules/level/`（`level.types.ts`、`level.schema.ts`、`level.service.ts`、`level.repo.ts`、`index.ts`）
- 新增 Firestore collections：`level_current_periods`（或等效的當前週期狀態）、`level_metric_entries`、`level_history`、`level_tiers`
- 新增 API：內部批次評等 endpoint（GCP Cloud Scheduler 呼叫，需共享密鑰驗證）
- 新增 admin 後台頁面：等級級距表管理（`apps/admin/pages/...`）
- 新增環境變數：內部批次 endpoint 的共享密鑰
- 依賴現有機制：`openspec/specs/feature-flags`（模組開關）、`apps/server/server/modules/logs` 的 ledger pattern 作為架構參考、`apps/server/server/modules/rate-limit` 的過期判斷邏輯作為參考前例
- 不影響現有模組的既有行為，`level` 模組不讀寫其他模組的 Firestore 資料，僅透過 `userId: string` 等 primitive 跨模組溝通
