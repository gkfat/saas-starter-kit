## 1. Server: users module

- [x] 1.1 於 `server/modules/users/users.repo.ts` 新增 `updateUserDisplayName(tenantId, uid, displayName)`（比照 `updateUserPhone`）
- [x] 1.2 於 `server/modules/users/users.service.ts` 新增 `syncUserDisplayName(tenantId, uid, displayName)`，呼叫 repo 方法
- [x] 1.3 於 `server/modules/users/index.ts` 匯出新增的 service 方法

## 2. Server: API 路由

- [x] 2.1 新增 `server/api/profile/display-name.patch.ts`，比照 `phone.patch.ts` 寫法：取 `AuthenticatedContext`、以 zod 驗證 body（`displayName` trim 後 1～50 字元），呼叫 service，回傳 `{ ok: true }`；驗證失敗回傳 400

## 3. i18n

- [x] 3.1 於 `i18n/locales/en.json`、`zh-TW.json` 的 `profile` namespace 新增編輯相關 key（`editDisplayName`、`save`、`cancel`、`displayNameUpdateSuccess`、`displayNameUpdateFailed`、`displayNameRequired`、`displayNameTooLong`）
- [x] 3.2 確認 `profile.displayName`、`profile.role` 既有 key 未被移除或誤改

## 4. 前端：個人資料頁編輯功能

- [x] 4.1 於 `pages/profile/index.vue` 將 displayName 顯示區塊改為可切換編輯模式（顯示模式 + 編輯模式，含輸入框、儲存/取消按鈕）
- [x] 4.2 實作儲存邏輯：呼叫 `PATCH /api/profile/display-name`，成功後以 `useToast().showSuccess` 提示並更新 `store.user.displayName`，失敗以 `showError` 提示
- [x] 4.3 為輸入框加上前端驗證（trim 後不可為空、長度上限 50），不合法時停用儲存按鈕或顯示錯誤提示

## 5. 前端：隱藏手機驗證區塊

- [x] 5.1 於 `pages/profile/index.vue` 隱藏「驗證手機號碼」區塊（含分隔線），保留原始程式碼與底層邏輯（`sendPhoneLinkOtp`、`confirmPhoneLinkOtp` 等）不變，以 `v-if="false"` 調整顯示條件

## 6. 驗證

- [x] 6.1 執行 `pnpm lint` 確認無 lint 錯誤
- [x] 6.2 執行 `pnpm build` 確認建置成功、型別檢查通過
- [x] 6.3 手動測試：編輯 displayName 成功/失敗情境、切換語系確認文案、確認手機驗證區塊已隱藏
