## Context

`server/middleware/03.auth.ts` 讓 `register`、`login`、`google-login`、`google-register` 四個端點完全略過驗證（`PUBLIC_PATHS`），且目前無任何計數或節流機制。`login_logs`（見 `logging` spec）已記錄 `ip`、`timestamp`、`result`，具備事後稽核能力，但缺少事中攔截機制。專案為 Nuxt 3 SPA + Nitro（Serverless/App Hosting），不可假設單一 process 的 in-memory 狀態能跨 instance 共用，因此限流狀態需落地於 Firestore。專案採 multi-tenant，所有資料路徑皆需 `tenants/{tenantId}/` 前綴。

## Goals / Non-Goals

**Goals:**

- 對 register / login（帳號密碼）兩個 public 端點提供以 IP（必要）與帳號識別（login 端點適用）為鍵的計數與鎖定機制
- 限流狀態持久化於 Firestore，正確 scope 到 tenant，避免跨 tenant 誤鎖
- 觸發限流時回傳 `429`，並透過既有 `modules/logs` 寫入 `login_log`（不新增 log schema）
- 前端登入頁能辨識 `429` 並顯示帳號鎖定警示，而非落入預設錯誤訊息
- 不引入新的第三方套件，沿用現有 Firestore + Nitro 基礎設施

**Non-Goals:**

- `google-login` / `google-register` 不納入本次限流範圍（idToken 已由 Google 簽發，濫用面與帳密暴力破解不同，若未來需要另開變更處理）
- 不導入 CAPTCHA / reCAPTCHA（列為未來獨立提案）
- 不做通用型 API rate limiting（例如已驗證使用者的一般 API 呼叫頻率）
- 不限制 `logout` 端點
- 不引入 Redis 或其他外部限流服務
- 不支援 exponential backoff（固定 15 分鐘鎖定，不隨重複觸發而遞增）

## Decisions

### 1. 限流狀態儲存：Firestore 文件 + transaction 遞增，而非查詢 `login_logs` 做 sliding window

- 選項 A（採用）：獨立 collection `tenants/{tenantId}/rate_limits/{key}`，欄位 `count`、`windowStart`、`lockedUntil`，以 Firestore transaction 讀取並遞增，避免併發競態
- 選項 B（捨棄）：即時查詢 `login_logs` 依 `ip`/`timestamp` 做 sliding window 統計
- **理由**：選項 B 需要每次登入都對 `login_logs` 做 range query，讀取成本隨歷史資料增長，且 `login_logs` 的用途定位是稽核記錄（見 `logging` spec），不應承擔限流判斷的職責。選項 A 是固定視窗計數器，讀寫成本可預期，且與 `login_logs` 的稽核用途保持關注點分離

### 2. 限流鍵與門檻：依端點類型區分 IP-only 與 IP+帳號，門檻值已與使用者確認

| 端點          | 限流鍵                                                 | 門檻與時間窗                                                | 理由                                                                               |
| ------------- | ------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| register      | `register:ip:{ip}`                                     | 每小時上限 10 次                                            | 註冊請求無既有帳號可綁定，僅能以 IP 節流                                           |
| login（帳密） | `login:ip:{ip}` 與 `login:account:{username}` 雙重限制 | 連續失敗 5 次，鎖定 15 分鐘（兩維度門檻相同，各自獨立計數） | IP 維度防止大量嘗試不同帳號（credential stuffing），帳號維度防止單一帳號被暴力破解 |

- 帳密登入任一維度觸發限流即回絕，並各自獨立計數與鎖定；不採用 exponential backoff，固定鎖定 15 分鐘
- `google-login`/`google-register` 不套用任何限流（見 Non-Goals）

### 3. Middleware 執行順序：新增 `server/middleware/02.rate-limit.ts`

- 依賴 Nitro 對 `server/middleware/` 檔名的字典序排序：`02.logging.ts` < `02.rate-limit.ts`（`l` < `r`），無需重新編號既有檔案即可插入於 `02.logging` 之後、`03.auth` 之前
- 限流 middleware 僅比對 `path` 是否為 `register`、`login` 兩個目標端點，其餘路徑（含 `google-login`、`google-register`、`logout`）直接放行
- 需在 `03.auth.ts` 之前執行，因為這兩個端點屬於 `PUBLIC_PATHS`，若限流放在 `03.auth` 之後會被略過保護

### 4. 觸發限流時的紀錄方式：沿用既有 `login_log` schema，不擴充欄位

- `severity: 'WARNING'`、`result: 'failure'`、`metadata: { reason: 'rate_limited', key, retryAfterSeconds }`
- 不新增欄位，維持 `logging` spec 現有 `LoginLog` 型別不變

### 5. 分層歸屬：新增 `server/modules/rate-limit/` module

- `rate-limit.service.ts`：判斷是否超過門檻、計算 `lockedUntil`，呼叫 `modules/logs` 寫入警告 log
- `rate-limit.repo.ts`：Firestore transaction 讀寫 `rate_limits` collection
- `index.ts`：僅匯出 middleware 呼叫所需的單一函式（例如 `checkRateLimit(key, policy)`），符合「跨 module 需經 index.ts」規範

### 6. 前端登入頁對 `429` 的辨識與警示

- `pages/auth/login.vue` 現行 `getLoginErrorMessage(e)`（第 94-105 行）僅比對 Firebase Auth 的 `e.code`（例如 `auth/wrong-password`），並未檢查 HTTP `statusCode`；後端 rate limit 回傳的 `429` 目前會落入預設訊息「登入失敗，請再試一次」
- 新增分支：`handleLogin` 呼叫 `/api/auth/login` 失敗時，優先檢查 `e.statusCode === 429`（或 `e.data?.statusCode`，依既有 `handleGoogleLogin` 已採用的 `e.data.statusCode` 慣例），顯示新增的 i18n 文案 `auth.error.accountLocked`
- 沿用現有機制：以 `useToast().showError()` 顯示，不改用 `useApiError`/`withErrorToast`（該機制目前僅用於 admin 頁面，與登入頁既有的 Firebase code 對照表風格不同，維持一致性優先於統一錯誤處理機制）
- 新增 i18n key（`i18n/locales/en.json`、`i18n/locales/zh-TW.json`）：`auth.error.accountLocked`，比照現有 `auth.error.tooManyRequests` 的格式與位置

## Risks / Trade-offs

- **[風險] 每次 register/login 呼叫新增 1 次 Firestore transaction 讀寫，增加延遲與成本** → 專案為展示用途，log/讀寫成本非考量重點（見專案既有決策），且僅作用於兩個低頻端點，非全站 API
- **[風險] 固定視窗計數在視窗邊界可能被繞過（例如視窗重置瞬間發送大量請求）** → 可接受，本提案目標是降低自動化腳本濫用門檻，非做到理論上無懈可擊；若未來需要更嚴謹的滑動視窗，可在此 module 內部替換演算法而不影響對外介面
- **[風險] IP 限流在企業 NAT/共用網路環境下可能誤傷多名合法使用者共用同一 IP** → 帳密登入額外採用帳號維度限流作為互補，降低單純依賴 IP 的誤傷風險
- **[風險] `tenantId` 預設為 `'default'`（多租戶尚未完全隔離）時，不同未指定 tenant 的請求可能共用同一限流桶** → 與現有系統其他模組的既有限制一致，非本提案需解決的範疇，行為與現況其餘 Firestore 資料一致

## Open Questions

（無 — 門檻值、鎖定時長與適用範圍已與使用者確認：register 10 次/小時/IP；login 帳號與 IP 皆為連續失敗 5 次鎖定 15 分鐘；google-login/google-register 不納入限流範圍）
