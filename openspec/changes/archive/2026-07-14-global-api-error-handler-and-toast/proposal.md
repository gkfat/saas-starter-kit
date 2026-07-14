## Why

目前各頁面的 API 呼叫錯誤處理分散且不一致，沒有統一的錯誤轉譯機制，也缺乏視覺化反饋，使用者無法得知操作的成功或失敗結果。需要一個全域 error handler 搭配 toast 通知元件來統一使用者體驗。

## What Changes

- 新增 `composables/useToast.ts`：全域 toast 狀態管理，提供 `showSuccess`、`showError`、`showInfo` 方法
- 新增 `components/AppToast.vue`：Toast UI 元件，支援 slide-fade 動畫，自動在數秒後消失
- 新增 `composables/useApiError.ts`：API 錯誤攔截器，將 HTTP 錯誤碼轉譯為繁體中文使用者友善訊息，並透過 `useToast` 呈現
- 在 `app.vue` 掛載 `<AppToast />` 元件，確保全域可見
- 更新現有頁面的 API 呼叫，改用 `useApiError` 取代各自的 catch 處理

## Capabilities

### New Capabilities

- `toast-notification`: 全域 toast 通知元件，支援 success/error/info 三種類型，slide-fade 動畫，可設定顯示時間，支援佇列多則訊息
- `api-error-handler`: 全域 API 錯誤處理 composable，將 HTTP status code 與已知 error code 轉譯為繁體中文訊息，並整合 `useToast`

### Modified Capabilities

## Impact

- 新增檔案：`composables/useToast.ts`、`composables/useApiError.ts`、`components/AppToast.vue`
- 修改：`app.vue`（掛載 AppToast）
- 修改：`pages/` 下各頁面的 API 呼叫 catch 區塊，改用 `useApiError`
- 依賴：Vuetify（現有，使用 `v-snackbar` 或自訂動畫實作）
- 無新增外部依賴
