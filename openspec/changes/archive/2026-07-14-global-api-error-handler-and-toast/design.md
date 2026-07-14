## Context

目前 `composables/useAuthFetch.ts` 提供帶有 Authorization header 的 fetch wrapper，但各頁面自行處理 catch，沒有統一的錯誤訊息格式或視覺反饋。Vuetify 已在 stack 中，可利用其動畫基礎。

## Goals / Non-Goals

**Goals:**

- 統一 API 錯誤轉譯邏輯，集中於一處維護
- 提供全域可呼叫的 toast 通知，支援 success / error / info
- Toast 動畫：從底部 slide-in，顯示數秒後 fade-out 自動消失
- 支援訊息佇列（多則訊息依序顯示）

**Non-Goals:**

- 不處理 WebSocket 或 SSE 錯誤
- 不持久化 toast 訊息到 Firestore
- 不新增全域 Axios/fetch interceptor（保留 Nuxt `useFetch` 模式）
- 不修改 server 端錯誤結構

## Decisions

### 1. Toast 狀態：composable 而非 Pinia store

Toast 通知是純 UI 狀態，生命週期短暫，不需要持久化或跨頁面共享歷史。
使用 `useToast` composable 搭配 module-level `ref`（singleton pattern），讓所有呼叫端共用同一個 reactive 佇列。

選擇放棄：Pinia store — 增加 boilerplate 且 toast 不屬於業務狀態。

### 2. Toast UI：自訂元件而非 Vuetify v-snackbar

`v-snackbar` 一次只顯示一則且動畫定制彈性有限。
自訂 `AppToast.vue` 使用 Vue `<TransitionGroup>` 搭配 CSS，實現佇列多則、slide-up + fade-out 動畫。
Vuetify 的 `v-card` 可用於外觀樣式。

### 3. 錯誤轉譯：集中對照表

在 `composables/useApiError.ts` 內維護 `HTTP_ERROR_MAP`（HTTP status code → 繁中訊息）。
Server 端一律使用 H3 `createError({ statusCode, message })`，`message` 為英文技術訊息，**不適合直接顯示給使用者**，因此不採用 `error.data.message`。
轉譯策略：直接查 `HTTP_ERROR_MAP`，無對應則 fallback 通用訊息。不需要 `API_ERROR_CODE_MAP`。

### 4. 整合方式：optional wrapper function

`useApiError` 提供兩種 API：

- `handleError(e: unknown): string` — 純轉譯，回傳訊息字串
- `withErrorToast<T>(fn: () => Promise<T>): Promise<T | null>` — 執行 async fn，catch 後自動呼叫 toast

頁面可根據需求選擇簡單或完整 wrapper，不強制全部替換。

## Risks / Trade-offs

- [Module-level singleton ref] 在 Nuxt SPA 模式下安全，但若未來啟用 SSR 需改為 `useState` → 目前 `ssr: false` 不受影響
- [自訂 Toast 元件] 需自行管理 z-index 與定位，確保覆蓋在 Vuetify dialog 之上 → 設定 `z-index: 9999` 並掛載於 `app.vue` 根層
- [錯誤訊息完整性] Server 端 error code 未統一，可能需逐步補充 `API_ERROR_CODE_MAP` → 初版以 HTTP status 為主，code map 為可選擴充
