# Spec: API Error Handler

## Purpose

提供統一的 API 錯誤處理機制。`useApiError` composable 負責將 HTTP status code 轉譯為繁體中文使用者訊息，並提供 `withErrorToast` wrapper 自動捕捉例外並顯示 toast 通知。

## Requirements

### Requirement: HTTP 錯誤碼轉譯

系統 SHALL 在 `useApiError` composable 內維護 `HTTP_ERROR_MAP`，將常見 HTTP status code 對應至繁體中文使用者訊息：

- 400 → 請求格式錯誤，請檢查輸入內容
- 401 → 登入已過期，請重新登入
- 403 → 您沒有權限執行此操作
- 404 → 找不到請求的資源
- 409 → 資料衝突，請重新整理後再試
- 422 → 輸入資料驗證失敗
- 429 → 請求過於頻繁，請稍後再試
- 500 → 伺服器發生錯誤，請稍後再試
- default → 發生未知錯誤，請稍後再試

Server 端使用 H3 `createError({ statusCode, message })`，`message` 為英文技術訊息，不適合直接顯示，轉譯策略以 `statusCode` 為唯一依據。

#### Scenario: 已知 HTTP 錯誤碼轉譯

- **WHEN** API 回傳 HTTP 403
- **THEN** `handleError` 回傳「您沒有權限執行此操作」

#### Scenario: 未知錯誤碼 fallback

- **WHEN** API 回傳 HTTP 503（不在對照表）
- **THEN** `handleError` 回傳通用訊息「發生未知錯誤，請稍後再試」

#### Scenario: Server message 不用於顯示

- **WHEN** API 回傳 `{ statusCode: 401, message: 'Invalid or expired token' }`
- **THEN** `handleError` 回傳「登入已過期，請重新登入」而非 server 的英文訊息

### Requirement: withErrorToast wrapper

系統 SHALL 提供 `withErrorToast<T>(fn: () => Promise<T>): Promise<T | null>` 函式，執行 async fn，若拋出例外則自動呼叫 `useToast().showError(handleError(e))` 並回傳 `null`；成功則直接回傳結果。

#### Scenario: 成功時不觸發 toast

- **WHEN** 傳入的 fn 成功 resolve
- **THEN** 不顯示任何 toast，回傳 fn 的結果

#### Scenario: 失敗時觸發 error toast

- **WHEN** 傳入的 fn 拋出 HTTP 401 錯誤
- **THEN** 顯示 error toast「登入已過期，請重新登入」，回傳 `null`

### Requirement: 成功操作可手動觸發 toast

系統 SHALL 透過 `useToast().showSuccess(message)` 讓頁面在成功操作後手動顯示成功通知，`useApiError` 不自動顯示成功訊息（由呼叫端決定）。

#### Scenario: 手動顯示成功訊息

- **WHEN** 頁面呼叫 `useToast().showSuccess('使用者已更新')`
- **THEN** 顯示 success toast 4 秒後自動消失
