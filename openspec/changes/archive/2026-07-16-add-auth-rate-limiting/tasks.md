## 1. rate-limit module 建置

- [x] 1.1 建立 `server/modules/rate-limit/rate-limit.types.ts`：定義限流 policy 型別（`windowSeconds`、`maxAttempts`、`lockoutSeconds`）與 `RateLimitResult` 型別
- [x] 1.2 建立 `server/modules/rate-limit/rate-limit.repo.ts`：以 Firestore transaction 讀取／建立／遞增 `tenants/{tenantId}/rate_limits/{key}` 文件，處理 `count`、`windowStart`、`lockedUntil` 欄位
- [x] 1.3 建立 `server/modules/rate-limit/rate-limit.service.ts`：實作 `checkAndConsume(tenantId, key, policy)`，回傳是否允許放行／剩餘鎖定秒數；提供 `resetOnSuccess(tenantId, key)` 供登入成功時重置帳號維度計數；內建固定 policy 常數：register 為 `{ windowSeconds: 3600, maxAttempts: 10 }`（無鎖定，超過即拒絕本次請求並持續計數至視窗結束），login 為 `{ windowSeconds: 900, maxAttempts: 5, lockoutSeconds: 900 }`（連續失敗 5 次鎖定 15 分鐘，不做 exponential backoff）
- [x] 1.4 建立 `server/modules/rate-limit/index.ts`：僅匯出 middleware 與 service 所需的公開函式

## 2. Middleware 整合

- [x] 2.1 建立 `server/middleware/02.rate-limit.ts`，確認執行順序落於 `02.logging.ts` 之後、`03.auth.ts` 之前
- [x] 2.2 針對 `register` 路徑套用 `register:ip:{ip}` policy（10 次/小時），超過門檻回傳 `429` 並中止後續處理
- [x] 2.3 針對 `login`（帳密）路徑套用 `login:ip:{ip}` 與 `login:account:{username}` 雙重 policy（連續失敗 5 次鎖定 15 分鐘），任一觸發鎖定即回傳 `429`
- [x] 2.4 確認 `logout`、`google-login`、`google-register` 與其他非目標路徑不受此 middleware 影響（直接放行，不計數）

## 3. Login flow 整合

- [x] 3.1 於 `server/api/auth/login.post.ts` 帳密登入成功路徑呼叫 `resetOnSuccess`，清除該帳號的失敗計數
- [x] 3.2 確認密碼錯誤時的既有失敗路徑會被 middleware 的計數機制正確累計（不需在 API handler 內重複計數）

## 4. 前端：登入頁鎖定警示

- [x] 4.1 於 `i18n/locales/en.json`、`i18n/locales/zh-TW.json` 的 `auth.error` 區塊新增 `accountLocked` 文案（比照現有 `tooManyRequests` 格式與位置）
- [x] 4.2 於 `pages/auth/login.vue` 的 `handleLogin` 錯誤處理中新增對 `429`（`e.statusCode` 或 `e.data?.statusCode`，依既有 `handleGoogleLogin` 慣例）的判斷分支，顯示 `auth.error.accountLocked` 訊息，優先於既有 `getLoginErrorMessage(e)` 的 Firebase code 對照
- [x] 4.3 確認非 429 的既有錯誤（如密碼錯誤 401）顯示邏輯未受影響

## 5. 限流觸發時的稽核記錄

- [x] 5.1 觸發限流時，透過 `modules/logs` 公開 API 寫入 `login_log`：`severity: WARNING`、`result: failure`、`metadata: { reason: 'rate_limited', key, retryAfterSeconds }`
- [x] 5.2 確認寫入呼叫遵循現有跨 module 呼叫規範（僅透過 `modules/logs/index.ts`）

## 6. 驗證

- [x] 6.1 執行 `pnpm dev` 啟動 dev server，另開終端機執行 `pnpm test`（`tests/rate-limit.test.ts`），確認以下項目全數通過，取代原手動測試步驟：
  - register 同一 IP 超過 10 次/小時 → 第 11 次回傳 `429`
  - 同一帳號連續密碼錯誤 5 次 → 觸發 15 分鐘鎖定，鎖定期間該帳號登入請求皆回傳 `429`
  - 同一 IP 對不同帳號連續失敗 5 次 → 觸發 IP 維度 15 分鐘鎖定
  - 登入成功後，該帳號失敗計數已重置（後續失敗回傳 `401` 而非 `429`）
  - 連續呼叫 `google-login` 超過任何次數，不受限流影響（無 `429`）
- [x] 6.2 觸發登入鎖定後，確認 `/api/auth/login` 回傳的 429 body 為 `{ statusCode: 429, message: 'Too many login attempts...' }`（實測 curl 觸發第 6 次請求驗證），符合 `login.vue` `handleLogin` 對 `e.data?.statusCode === 429` 的判斷式，會走 `accountLocked` 文案分支——本環境無瀏覽器自動化工具，未做像素級 UI 畫面確認，僅驗證前後端契約與程式邏輯
- [x] 6.3 確認不同 tenant 的限流計數彼此獨立——審閱 `rate-limit.repo.ts` 的 `rateLimitRef`，Firestore 文件路徑為 `tenants/{tenantId}/rate_limits/{key}`，`tenantId` 完全由呼叫端傳入且無任何跨路徑共用狀態或快取，故不同 tenantId 必然對應獨立文件；目前 API 端點寫死 `tenantId='default'` 是既有限制（非本次變更範圍），模組本身邏輯已確認正確
- [x] 6.4 確認 `pnpm lint` 與 `pnpm build` 通過
