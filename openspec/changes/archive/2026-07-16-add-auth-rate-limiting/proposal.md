## Why

`server/middleware/03.auth.ts` 目前對 `PUBLIC_PATHS`(register、login、google-login、google-register)完全不做頻率限制，任何人皆可對這些端點無限次呼叫，形成暴力破解密碼與批量假帳號註冊的風險。`login_logs` 雖已記錄 IP、時間戳與成功/失敗結果，但目前僅供稽核查詢，未被任何邏輯用來偵測與阻擋異常頻率。

## What Changes

- 新增 Firestore-based 限流機制，於 auth middleware 之前攔截 register 與 login（帳號密碼）兩個 public 端點；**google-login / google-register 不納入本次限流範圍**
- register：同一 IP 每小時上限 10 次，超過回傳 `429 Too Many Requests`
- login：帳號與 IP 採相同門檻——連續失敗 5 次即鎖定 15 分鐘（帳號維度與 IP 維度各自獨立計數與鎖定，任一觸發即回絕）
- 觸發限流時寫入 `login_logs`（`severity: WARNING`，`result: failure`，並於 `metadata` 標註觸發原因）
- 限流狀態資料以 tenant 為界線儲存於 Firestore，避免跨 tenant 誤判
- 前端登入頁（`pages/auth/login.vue`）新增對 HTTP `429` 的辨識與警示訊息，告知使用者帳號已被鎖定及預估解鎖時間
- 不新增第三方 rate-limit 套件；不含 CAPTCHA/reCAPTCHA 導入（列為未來獨立提案）
- `logout`、`google-login`、`google-register` 與其他已驗證端點不在本次限流範圍內

## Capabilities

### New Capabilities

- `auth-rate-limiting`: 對 register／login（帳號密碼）public 端點提供以 IP／帳號為鍵的頻率限制與鎖定機制，並將觸發事件寫入既有 login_logs；同時定義前端登入頁對鎖定狀態的警示行為

### Modified Capabilities

（無 — register/login 本身的成功路徑行為與既有 `auth`、`user-registration`、`logging` spec 規範的需求不變，限流是新增的獨立防護層，不變更既有 requirement 的行為契約）

## Impact

- **新增檔案（後端）**：`server/modules/rate-limit/`（`service.ts`、`repo.ts`、`types.ts`、`index.ts`），`server/middleware/02.rate-limit.ts`
- **修改檔案（後端）**：`server/middleware/03.auth.ts`（確認限流 middleware 執行順序不受影響）；`server/api/auth/login.post.ts`（登入成功時重置帳號失敗計數）
- **修改檔案（前端）**：`pages/auth/login.vue`（新增對 HTTP `429` 的辨識與鎖定警示訊息）、`i18n/locales/en.json`、`i18n/locales/zh-TW.json`（新增 `auth.error.accountLocked` 等文案）
- **新增 Firestore collection**：`tenants/{tenantId}/rate_limits/{key}`
- **不影響**：Firebase Auth 設定、google-login/google-register 端點、既有 login/register 成功路徑邏輯
- **相依模組**：`rate-limit` 需讀寫 Firestore（透過既有 `server/shared/firebase-admin.ts`），並呼叫 `modules/logs` 的公開 API 寫入 login_log（經 `index.ts`）
