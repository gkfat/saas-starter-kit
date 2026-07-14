## 1. Toast 通知系統

- [x] 1.1 建立 `composables/useToast.ts`：module-level singleton `ref` 佇列，實作 `showSuccess`、`showError`、`showInfo`，每則通知含 id、type、message、duration（預設 4000ms），並在 duration 後自動從佇列移除
- [x] 1.2 建立 `components/AppToast.vue`：使用 Vue `<TransitionGroup>` 搭配 CSS 實現 slide-up 進場與 fade-out 離場動畫，固定定位於畫面右下角，z-index: 9999，各 toast 使用 Vuetify `v-card` 呈現外觀，含關閉按鈕
- [x] 1.3 在 `app.vue` 掛載 `<AppToast />`，放置於 `<NuxtPage />` 之後

## 2. API Error Handler

- [x] 2.1 建立 `composables/useApiError.ts`，定義 `HTTP_ERROR_MAP`（400/401/403/404/409/422/429/500 → 繁中訊息）
- [x] 2.2 實作 `handleError(e: unknown): string`：取 error 的 `statusCode`，查 `HTTP_ERROR_MAP`，無對應則回傳通用訊息（不使用 server 的英文 message）
- [x] 2.3 實作 `withErrorToast<T>(fn: () => Promise<T>): Promise<T | null>`：執行 fn，catch 後呼叫 `useToast().showError(handleError(e))` 並回傳 `null`

## 3. 整合至現有頁面

- [x] 3.1 掃描 `pages/` 下所有頁面，找出直接 `catch` API 錯誤的區塊，改用 `withErrorToast` 或 `handleError` 替換
- [x] 3.2 在適當的成功操作後（例如：更新使用者、刪除等）加入 `useToast().showSuccess('...')` 呼叫

## 4. 驗證

- [x] 4.1 執行 `pnpm lint` 確認無 lint 錯誤，`pnpm build` 確認型別編譯通過
- [x] 4.2 手動測試：觸發 HTTP 401/403/500 錯誤，確認對應 error toast 顯示並在 4 秒後自動消失
- [x] 4.3 手動測試：執行成功操作後 success toast 顯示，動畫（slide-up 進場、fade-out 離場）正常
- [x] 4.4 手動測試：快速連續觸發多則通知，確認佇列同時顯示且各自獨立消失
