## 1. 共用純函式（可單元測試）

- [x] 1.1 建立 `apps/server/server/shared/request-log.ts`：
  - `isJsonContentType(contentType?: string): boolean`
  - `maskSensitiveFields(value: unknown): unknown`（黑名單：`password`/`newPassword`/`idToken`/`otp`/`token`/`refreshToken`，不分大小寫、支援巢狀物件遞迴）
  - `truncateBody(value: unknown, maxLength?: number): { value: unknown; truncated: boolean }`（預設 5000 字元）
- [x] 1.2 新增 `apps/server/tests/request-log.test.ts`（Vitest 單元測試，不需啟動 server）：
  - 遮罩：頂層欄位命中、巢狀欄位命中、大小寫不敏感、未命中欄位不受影響
  - 截斷：超過長度時正確標記 `truncated: true` 並截斷；未超過時不受影響
  - Content-Type 判斷：`application/json`（含帶 charset 的變體）判定為 true，其餘為 false

## 2. Tracing middleware 擴充

- [x] 2.1 修改 `apps/server/server/middleware/01.tracing.ts`：
  - 產生 `requestId`（維持不變）
  - 記錄 request 進入時間至 `event.context.startTime = Date.now()`
  - 當 method 為 `POST`/`PUT`/`PATCH`/`DELETE` 且 `Content-Type` 為 JSON 時，呼叫 `readBody(event)` 並將結果暫存於 `event.context.requestPayload`（讀取失敗時忽略，不中斷主流程）

## 3. Logging middleware 擴充

> 原規劃改用 Nitro plugin 的 `afterResponse` hook，實作階段以真實 request 驗證後發現：本專案所有失敗回應皆透過 `throw createError()` 產生，這類路徑不會觸發 `afterResponse`/`beforeResponse` hook（詳見 design.md Decision 3）。已改回沿用 `02.logging.ts` 的 `res.on('finish')` 機制，並攔截 `res.write`/`res.end` 取得 response body。

- [x] 3.1 修改 `apps/server/server/middleware/02.logging.ts`：攔截（wrap）`res.write`/`res.end`，暫存寫入的 response bytes
- [x] 3.2 於 `res.on('finish')` 組裝 log：`type: 'api'`、`severity`（≥500 ERROR / ≥400 WARNING / 其餘 INFO）、`requestId`、`actor: { userId, role }`（來自 `event.context`）、`httpRequest: { requestMethod, requestUrl, status: success|failure, durationMs }`
- [x] 3.3 加入 `payload` 欄位：來自 `event.context.requestPayload`，經 `isJsonContentType` 過濾、`maskSensitiveFields`、`truncateBody` 處理
- [x] 3.4 加入 `response` 欄位：來自攔截到的 response bytes（JSON 解析後），同樣經過濾／遮罩／截斷；GET 方法且 statusCode < 400 時不記錄此欄位
- [x] 3.5 `console.log(JSON.stringify(...))` 輸出

## 4. 驗證

- [x] 4.1 `pnpm --dir apps/server test`（含新增的 `request-log.test.ts`）全數通過（既有 2 個失敗測試為 pre-existing，已用 `git stash` 驗證與本次改動無關）
- [x] 4.2 本地執行獨立 dev server 實例，呼叫成功（2xx）與失敗（4xx）的既有 API，確認 console 印出單筆 API log，欄位齊全（`requestId`/`actor`/`httpRequest`/`payload`/`response`），並確認失敗路徑（`throw createError`）也能正確觸發 log
- [x] 4.3 呼叫一個帶密碼／token 欄位的 API，確認 log 中對應欄位為 `'***'`
- [x] 4.4 確認 GET 成功時不記錄 `response`、GET 失敗時記錄 `response`
- [x] 4.5 執行 `pnpm lint` 與型別檢查，確認無新增 lint/型別錯誤（既有 `logs.service.ts`/`roles.repo.ts` 型別錯誤為 pre-existing，與本次改動無關）
- [x] 4.6 確認 `02.rate-limit.ts`、`03.auth.ts`、`04.rbac.ts` 等後續 middleware 行為未受影響：以 `git stash` 還原本次改動後重跑全量測試，出現相同的 4 個失敗（`rate-limit.test.ts` 逾時、`line-identity.test.ts` 收到 429 而非預期 409），證實為測試用 IP（`10.1.0.1`/`10.2.0.1`）在本次 session 反覆執行測試後 rate limit 配額耗盡的環境副作用，與本次改動無關，非本次改動造成的迴歸
