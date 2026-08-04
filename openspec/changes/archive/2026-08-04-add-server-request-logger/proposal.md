## Why

現有 `01.tracing.ts` 只產生 `requestId`，`02.logging.ts` 只在 response finish 時印出一筆含 status/耗時的 log，完全沒有記錄 request 送了什麼 payload、response 回了什麼內容，也沒有記錄操作者身份。查問題時（例如「使用者回報某個操作失敗」）只能看到 method/url/status，看不到當下實際的請求內容與伺服器回應，無法有效追查。

## What Changes

- 修改 `apps/server/server/middleware/01.tracing.ts`：產生 `requestId`（不變）、額外記錄 request 進入時間，並在 request 帶有 body 且 `Content-Type` 為 `application/json` 時，讀取並暫存 payload 供結束時記錄使用。
- 新增 `apps/server/server/shared/request-log.ts`：提供純函式 `maskSensitiveFields`、`truncateBody`、`isJsonContentType`，供 log 組裝時做敏感欄位遮罩、內容截斷、Content-Type 過濾。**不提供**通用 `logger.debug/info/warn/error` API，此 change 僅處理 API request/response 這一筆彙總 log，不處理 service/repo 層的日誌需求。
- 修改 `apps/server/server/middleware/02.logging.ts`：沿用既有 `res.on('finish')` 機制（確保無論成功或例外/`createError` 拋出的失敗路徑都會觸發 — 詳見 design.md 的技術限制說明），額外攔截 `res.write`/`res.end` 取得 response body，於 request 結束時輸出**單一筆** API log，內容涵蓋：
  - `type: 'api'`、`severity`、`requestId`、`actor: { userId, role }`
  - `httpRequest`: method、url、status（`success`/`failure`）、`durationMs`（整數毫秒）
  - `payload`（已遮罩／截斷，非 JSON 內容跳過）
  - `response`（已遮罩／截斷；GET 且成功 2xx 時不記錄，GET 失敗時仍記錄；非 JSON 內容跳過）
- 不追蹤 IP。

## Capabilities

### New Capabilities

（無，本次為擴充既有 logging 能力，不新增獨立 capability）

### Modified Capabilities

- `logging`: 新增「API log 需記錄單次 request 完整生命週期（含 payload/response、成功失敗、耗時 ms、操作者）」相關需求，並更新 API log 欄位定義（新增 `type`、`actor`、`payload`、`response`）。

## Impact

- 新增檔案：`apps/server/server/shared/request-log.ts`（純函式，含單元測試）
- 修改檔案：`apps/server/server/middleware/01.tracing.ts`、`apps/server/server/middleware/02.logging.ts`
- 受影響範圍：所有 server 端 API request 的 log 輸出格式與內容（GCP Log Explorer 查詢方式改變，但不影響現有 API 行為與 response）
- 不影響 service/repo 層現有程式碼，不需為此 change 修改任何 `modules/*/service.ts`、`repo.ts`
- 無新增第三方依賴（沿用 h3 內建的 `readBody`，以及 Node.js 原生 `res.write`/`res.end`/`res.on('finish')`）
- 不將此 log 寫入 Firestore，不提供 admin 後台查詢介面（範圍外，留待未來獨立 change）
