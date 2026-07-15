## Why

個人資料頁目前僅唯讀顯示 `displayName`，使用者無法自行修改。同時，手機驗證區塊目前一律顯示，但該功能尚未穩定啟用，需先隱藏以避免使用者誤用。

## What Changes

- 個人資料頁新增編輯 `displayName` 功能（表單輸入 + 儲存 + 成功/失敗提示）
- 新增對應的 server API（`PATCH /api/profile/display-name`）與 `users` module 的更新方法，遵循既有 `phone.patch.ts` 慣例
- 確認 `displayName`、`role` 欄位標籤持續使用既有 i18n key（`profile.displayName` / `profile.role`），新增編輯相關文案（如編輯按鈕、儲存成功/失敗訊息）之 i18n key
- 隱藏個人資料頁的「驗證手機號碼」區塊（`v-if="!store.user?.phone"` 區塊），暫不變更底層驗證邏輯，僅在畫面上隱藏入口

## Capabilities

### New Capabilities

- `profile-self-service`: 使用者於個人資料頁自行編輯 displayName 的行為與規則

### Modified Capabilities

(無既有 spec 名稱受影響 — `openspec/specs/` 中尚無 `profile` 相關 capability)

## Impact

- `pages/profile/index.vue`：新增編輯表單 UI、隱藏手機驗證區塊
- `server/api/profile/display-name.patch.ts`（新增）
- `server/modules/users/users.repo.ts`、`users.service.ts`：新增 `updateUserDisplayName` 相關方法
- `i18n/locales/en.json`、`zh-TW.json`：新增編輯相關文案 key
- `stores/auth.ts`（若需要更新前端 store 中的 user 狀態，待 design 階段確認）
