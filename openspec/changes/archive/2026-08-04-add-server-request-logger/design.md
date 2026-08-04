## Context

現有 request pipeline：`00.cors → 01.tracing → 02.logging → 02.rate-limit → 03.auth → 04.rbac`。

- `01.tracing.ts` 只做一件事：產生 `requestId` 並寫入 `event.context.requestId` + response header。
- `02.logging.ts` 只在 `res.on('finish')` 時印一筆 log（含 status/latency），資訊來源全部來自 `event.node.req/res`，不含 payload、response body、操作者身份。
- 本 change 的目的明確限定在「追蹤單次 API request 從進入到結束的完整內容（含 payload/response）」，**不處理 service/repo 層的日誌需求**（service/repo 若未來需要日誌能力，另開獨立 change 處理）。因此不需要跨 middleware/深層呼叫鏈傳遞 context 的機制。

## Goals / Non-Goals

**Goals:**

- 單次 API request 結束時輸出**一筆**結構化 log，涵蓋 method/url/status/成功失敗/耗時（ms）/操作者/payload/response。
- log 帶上目前 request 的 `requestId`，讓 GCP Log Explorer 可用 `requestId` 查詢單一 request 的紀錄。
- 敏感欄位（密碼、token、OTP 等）記錄前遮罩，避免憑證外洩進日誌系統。
- 維持現有 GCP Structured Logging JSON 格式慣例（`severity`/`message`/`httpRequest`），並補上 `type: 'api'`、`actor`，對齊 `openspec/specs/logging/spec.md` 既有的 `BaseLog` 定義。

**Non-Goals:**

- 不提供可被 service/repo 呼叫的通用 logger（`AsyncLocalStorage` 等跨層級 context 傳遞機制不需要）。
- 不整合 GCP Cloud Trace（`X-Cloud-Trace-Context`）－ 目前部署在 Firebase App Hosting，非 Cloud Run，暫不處理。
- 不追蹤 IP。
- 不將 API log 寫入 Firestore（維持現況：只有 `audit_logs`/`login_logs` 進 Firestore）。
- 不提供 admin 後台查詢介面 — 若未來需要在 admin 後台呈現 trace log，屬於獨立的儲存/查詢架構決策（console-only log 無法直接被 admin 後台查詢），需另開 change 討論是否改寫入 Firestore 或串接 GCP Cloud Logging API。
- 不改變 `modules/logs/`（audit_log／login_log）現有寫入邏輯與 schema。
- 不引入第三方 logging 套件 — 沿用 `console.log` + `JSON.stringify`。

## Decisions

### 1. 不使用 `AsyncLocalStorage`，改在 middleware 層直接讀取 `event.context`

- **選擇**：由於 service/repo 層不需要呼叫日誌功能（Non-Goal），本次不需要任何跨呼叫鏈傳遞 `requestId` 的機制。log 組裝完全在 `01.tracing.ts`（寫入 `event.context`）與 `02.logging.ts`（讀取 `event.context`，`res.on('finish')` 時輸出）之間完成，兩者都同步拿得到同一個 `event`，不需要 `AsyncLocalStorage`。
- **理由**：範圍限定後，原本 `AsyncLocalStorage` 要解決的問題（service/repo 拿不到 `event`）不存在，移除可大幅降低實作與驗證成本，也不用驗證 ALS 能否跨 Nitro middleware 檔案傳遞 context 這個高風險技術問題。

### 2. Request/response body 擷取機制

- **Request body**：h3 的 `readRawBody`/`readBody` 內部已透過 `RawBodySymbol`／`ParsedBodySymbol` 將 raw body／parsed body 快取在 `event.node.req` 上（見 `node_modules/h3/dist/index.mjs`），同一個 request 內重複呼叫 `readBody(event)` 不會重新消費 stream、不影響後續 api handler 正常呼叫 `readBody()`。因此 `01.tracing.ts` 可直接呼叫 `readBody(event)` 取得 payload 並暫存於 `event.context.requestPayload`，不需要額外設計快取層。
- **Response body**：~~原規劃使用 `afterResponse` app hook 取得 response body~~ — 實作階段以真實 request 驗證後發現此路不可行（見 Decision 3 的技術限制說明）。改為在 `02.logging.ts` 攔截 `res.write`/`res.end`（wrap 原函式，將寫入的 chunk 暫存於陣列），取得實際送出的 response bytes。
- **理由**：request body 快取沿用 h3 既有機制無需新增邏輯；response body 攔截雖然多一層 wrap，但這是唯一能同時涵蓋成功與失敗兩種路徑、且不需新增依賴的做法。

### 3. Log 輸出時機與位置：沿用 `02.logging.ts`（`res.on('finish')`），**不使用** `afterResponse` hook

- **原規劃**（已否決）：新增 Nitro plugin，透過 `nitroApp.hooks.hook('afterResponse', ...)` 一次組裝並輸出 log，取代 `02.logging.ts`。
- **否決原因（實測發現的技術限制）**：本專案所有失敗回應（4xx/5xx）皆透過 `throw createError({...})` 產生。追蹤 `h3`/`nitropack` 原始碼並以獨立 dev server 實測後確認：這類例外會被 h3 `toNodeListener` 的外層 `catch` 攔截，先呼叫 Nitro 的 `onError`（內部已呼叫 `sendError()` 送出並結束 response），接著检查 `if (event.handled) return;`——此時 `event.handled` 已為 `true`（`res.writableEnded`/`res.headersSent` 已成立），因此**直接 return，`afterResponse`（及 `beforeResponse`）hook 完全不會被呼叫**。實測結果：呼叫回傳 401/400 的 API 完全沒有任何 log 輸出，只有正常 `return`（未 `throw`）的 2xx 成功路徑才會觸發 `afterResponse`。
- **最終選擇**：維持 `02.logging.ts` 使用 `res.on('finish')`（Node.js 原生 `ServerResponse` 事件）——這是原始設計選用它的原因：不管 response 是透過正常 `return` 或 `throw createError` 結束，只要 `res.end()` 被呼叫（`sendError()` 內部也會呼叫），`finish` 事件保證觸發。為了同時取得 response body，在同一個 middleware 內對同一個 `res` 物件的 `write`/`end` 方法做 wrap，於 `finish` 觸發時使用暫存的 bytes 組裝 log。
- **代價**：wrap `res.write`/`res.end` 比單純使用官方 hook 多了一層自製邏輯，需注意 chunk 型別（`string`/`Buffer`/`Uint8Array`）與呼叫簽名的多載相容性。已在 `apps/server/server/middleware/02.logging.ts` 以型別安全方式實作並實測驗證（含 2xx 成功、4xx 失敗兩種路徑）。

### 4. 敏感欄位遮罩

- **選擇**：`request-log.ts` 維護初始黑名單 `['password', 'newPassword', 'idToken', 'otp', 'token', 'refreshToken']`，`maskSensitiveFields` 對 payload/response 物件做**淺層 + 巢狀遞迴**掃描，命中欄位名稱（不分大小寫）以 `'***'` 取代欄位值。
- **理由**：避免密碼／token／OTP 明文進入 GCP Cloud Logging。清單為已知欄位，非窮舉，日後新增涉密欄位時比照擴充清單。

### 5. Content-Type 過濾與長度截斷

- **選擇**：只記錄 `Content-Type: application/json` 的 payload/response；其餘（multipart/binary 等）以 `'[skipped: <content-type>]'` 標記取代內容。記錄內容超過 5000 字元時截斷，並標記 `truncated: true`。
- **理由**：避免二進位/檔案內容塞入 JSON log 造成格式錯誤或單筆 log 過大（GCP Cloud Logging 單筆 entry 上限 256KB）。

### 6. GET 方法的 response 記錄規則

- **選擇**：GET 方法且 status < 400（成功）時不記錄 response；GET 方法但 status >= 400（失敗）時仍記錄 response。非 GET 方法一律照一般規則記錄（受 Content-Type/長度限制）。
- **理由**：GET 成功回應常見資料量大（列表查詢），記錄意義不高；GET 失敗時的 response 通常是簡短錯誤訊息，是查問題時最有價值的內容，不應跳過。

### 7. `actor` 欄位

- **選擇**：`res.on('finish')` 觸發時 `event.context` 已經過 `03.auth.ts`（若該 request 有通過驗證），可直接讀取 `event.context.userId`/`role` 組成 `actor: { userId, role }`；未認證的 request 則為空字串／undefined，不強制要求登入才記錄。

## Risks / Trade-offs

- [Risk] Request 中途未觸發 `res.on('finish')`（process crash、連線中斷）時完全無紀錄。→ 接受此風險，範圍與規模現況可接受。
- [Risk] 敏感欄位遮罩清單為手動維護，未涵蓋到的欄位命名（如 `secret`、`verificationCode`）仍可能外洩。→ Mitigation：清單於 code review 時列為重點檢查項目，新增涉密欄位的 API 時需同步擴充清單。
- [Trade-off] 不整合 Cloud Trace，Log Explorer 只能靠 `requestId` 手動查詢關聯。可接受，因目前非 Cloud Run 部署。
- [Trade-off] Admin 後台無法直接查詢此 log（僅存在 console/GCP Cloud Logging）。若未來需要 admin 呈現，需另開 change 重新決定儲存策略（Firestore 或串接 GCP Cloud Logging API），不在本次範圍。

## Migration Plan

- 新增 `request-log.ts`（shared），修改 `01.tracing.ts`、`02.logging.ts`。不影響現有 API 行為與 response，可直接部署，無需 feature flag。
- Rollback：還原 `01.tracing.ts`、`02.logging.ts`，移除新增的 `request-log.ts`（shared 與其測試檔）即可。

## Open Questions

（無 — 原先「AsyncLocalStorage 是否能跨 Nitro middleware chain 傳遞 context」的技術風險已因範圍調整而不再適用）
