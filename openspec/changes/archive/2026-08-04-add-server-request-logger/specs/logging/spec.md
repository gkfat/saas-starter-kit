## ADDED Requirements

### Requirement: API log 記錄單次 request 完整生命週期

系統 SHALL 在每次 API request 結束時（response 完成）輸出**一筆** API log，`type` SHALL 為 `'api'`，內容 SHALL 包含 `requestId`、`actor`（`userId`/`role`，未認證時為空）、`httpRequest`（method、url、status: `'success' | 'failure'`、`durationMs`）。`status` 當 statusCode < 400 為 `success`，否則為 `failure`；`severity` 依現有規則（≥500 → ERROR，≥400 → WARNING，其餘 INFO）設定。

#### Scenario: 成功的 API request

- **WHEN** 一筆 API request 進入系統並最終回傳 statusCode 200
- **THEN** 系統 SHALL 輸出一筆 API log，`httpRequest.status` SHALL 為 `success`，`httpRequest.durationMs` SHALL 為該 request 實際處理耗時的整數毫秒值

#### Scenario: 失敗的 API request

- **WHEN** 一筆 API request 最終回傳 statusCode 4xx 或 5xx
- **THEN** log 的 `httpRequest.status` SHALL 為 `failure`，`severity` SHALL 依規則設定為 `WARNING` 或 `ERROR`

#### Scenario: Request 中途未完成

- **WHEN** request 因連線中斷或 process 中止而未觸發 response 完成事件
- **THEN** 系統不需保證該次 request 有任何 log 輸出（已知限制，非本需求涵蓋範圍）

### Requirement: API log 記錄 request payload 與 response body

系統 SHALL 在 API log 中記錄 request payload（`payload` 欄位）與 response body（`response` 欄位），僅限 `Content-Type: application/json` 的內容；非 JSON 內容（如 multipart、binary）SHALL 以 `'[skipped: <content-type>]'` 標記取代，不記錄原始內容。內容長度超過 5000 字元時 SHALL 截斷，並標記 `truncated: true`。GET 方法且 status < 400 時 SHALL 不記錄 `response` 欄位；GET 方法且 status >= 400 時仍 SHALL 記錄。

#### Scenario: JSON payload 正常記錄

- **WHEN** 一筆 `POST` request 的 body 為 `Content-Type: application/json`
- **THEN** log 的 `payload` 欄位 SHALL 包含該 request body 內容（經遮罩／截斷處理後）

#### Scenario: 非 JSON 內容跳過

- **WHEN** request 或 response 的 `Content-Type` 非 `application/json`（例如 `multipart/form-data`）
- **THEN** 對應欄位 SHALL 記錄為 `'[skipped: multipart/form-data]'` 形式的標記，不記錄原始 binary 內容

#### Scenario: GET 成功時不記錄 response

- **WHEN** 一筆 `GET` request 最終回傳 statusCode 200
- **THEN** log SHALL 不包含 `response` 欄位（或其值為明確標記為未記錄）

#### Scenario: GET 失敗時仍記錄 response

- **WHEN** 一筆 `GET` request 最終回傳 statusCode 404
- **THEN** log SHALL 包含 `response` 欄位，內容為該次錯誤回應（經遮罩／截斷處理後）

#### Scenario: 內容過長時截斷

- **WHEN** payload 或 response 內容（JSON 序列化後）超過 5000 字元
- **THEN** 系統 SHALL 截斷內容至 5000 字元，並在該欄位標記 `truncated: true`

### Requirement: API log 敏感欄位遮罩

系統 SHALL 在記錄 `payload`／`response` 前，對內容中欄位名稱（不分大小寫）命中以下清單者，以 `'***'` 取代其值：`password`、`newPassword`、`idToken`、`otp`、`token`、`refreshToken`。此清單 SHALL 支援巢狀物件內的欄位掃描。

#### Scenario: 密碼欄位遮罩

- **WHEN** request payload 包含 `{ "password": "abc123" }`
- **THEN** log 的 `payload.password` SHALL 為 `'***'`，不得記錄原始密碼明文

#### Scenario: 巢狀欄位遮罩

- **WHEN** request payload 包含巢狀結構 `{ "user": { "idToken": "xxx" } }`
- **THEN** log 的 `payload.user.idToken` SHALL 為 `'***'`

### Requirement: 同一 request 的 log 可透過 requestId 查詢

系統 SHALL 確保每筆 API log 帶有目前 request 的 `requestId` 欄位值，以便在 GCP Log Explorer 中依 `requestId` 篩選查詢特定 request。

#### Scenario: requestId 存在於每筆 API log

- **WHEN** 任一 API request 觸發 API log 輸出
- **THEN** 該筆 log 的 `requestId` 欄位 SHALL 與該 request 的 `x-request-id` response header 相同
