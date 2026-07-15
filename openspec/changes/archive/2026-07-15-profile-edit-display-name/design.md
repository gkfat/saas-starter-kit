## Context

個人資料頁（`pages/profile/index.vue`）目前為唯讀顯示，`displayName`、`role` 標籤已透過 `$t('profile.displayName')` / `$t('profile.role')` 使用 i18n（`i18n/locales/en.json` / `zh-TW.json` 已有對應 key），此次不需新增或變更這兩個標籤 key，僅需新增編輯相關文案（按鈕、成功/失敗訊息）的 i18n key，並確保新增的 UI 不破壞既有 i18n 慣例。

`server/modules/users/` 已有 `syncUserPhone` → `updateUserPhone`（repo）與 `server/api/profile/phone.patch.ts` 作為自助更新（self-service PATCH，無 audit log）的既有範例，本次新增的 displayName 編輯功能將沿用相同分層與慣例。

手機驗證區塊（`v-if="!store.user?.phone"` 內的整段 UI，含 `recaptcha-container`、OTP 表單、`handleSendOtp`/`handleConfirmOtp`/`resetOtp`）功能尚未穩定，先隱藏入口，底層邏輯與 composable（`useAuth().sendPhoneLinkOtp` 等）保留不動。

## Goals / Non-Goals

**Goals:**

- 使用者可在個人資料頁編輯並儲存自己的 `displayName`
- 新增 `PATCH /api/profile/display-name` API，遵循 thin handler → service → repo 分層
- 隱藏個人資料頁「驗證手機號碼」區塊（UI 層隱藏，非刪除功能）
- displayName 編輯相關文案使用 i18n（新增 key），既有 `profile.displayName` / `profile.role` 標籤 key 維持不變

**Non-Goals:**

- 不重新設計手機驗證流程，只隱藏入口
- 不新增 audit_logs 寫入（自助編輯個人資料，比照 `phone.patch.ts` 不寫 audit log 的既有慣例）
- 不處理 `role` 欄位的可編輯性（role 僅管理員可改，走既有 `admin/users/[id].patch.ts`）
- 不新增 username 編輯功能

## Decisions

1. **API 路由沿用 `server/api/profile/` 慣例**：新增 `server/api/profile/display-name.patch.ts`，比照 `phone.patch.ts` 寫法：從 `AuthenticatedContext` 取得 `ctx.tenantId`、`ctx.userId`，以 zod 驗證 body（`displayName: string, 1~50 字, trim 後不可為空`），呼叫 service，回傳 `{ ok: true }`。
   - 替代方案：合併進通用 `profile.patch.ts` 處理多欄位——目前僅需 displayName 一個欄位，保持單一職責、對齊現有 `phone.patch.ts` / `google-provider.patch.ts` 各自獨立檔案的模式。

2. **Service/Repo 新增對稱方法**：`users.service.ts` 新增 `updateUserDisplayName(tenantId, uid, displayName)`，內部呼叫 `users.repo.ts` 新增的 `updateUserDisplayName(tenantId, uid, displayName)`（比照 `updateUserPhone`）。

3. **前端狀態同步**：儲存成功後，需將 `useAuthStore` 內的 `user.displayName` 同步更新（避免需重新整理頁面才看到最新值）。採用 API 回應成功後直接於前端 `store.user.displayName = 新值` 的方式更新（比照 store 內既有 `user` 為可變 ref 物件的用法），不新增額外的 store action。

4. **手機驗證區塊隱藏方式**：在 `pages/profile/index.vue` 樣板中，將整段 `<div v-if="!store.user?.phone">...</div>`（第 61–95 行）改為始終不顯示。採用最小改動：加上恆為 false 的顯示條件（例如 `v-if="false"`）或直接以樣板註解包裹整段。實作階段選擇其中一種並保留原始程式碼位置與縮排，方便未來恢復。

## Risks / Trade-offs

- [風險] 前端 store 直接寫入 `user.displayName` 可能與其他讀取 `store.user` 的頁面產生不一致假設 → 緩解：僅更新既有欄位值，不改變 `user` 物件結構或型別。
- [風險] 隱藏手機驗證區塊後，若使用者的 `phone` 欄位仍為 null，將無任何 UI 入口可補齊 → 緩解：此為需求明確要求「先隱藏」，非本次範圍內的功能移除，之後恢復僅需還原 `v-if` 條件。
- [Trade-off] 不寫 audit log：與管理員修改使用者角色（會寫 audit log）行為不同，但比照 `phone.patch.ts` 既有自助更新慣例，維持一致性優先於補齊稽核紀錄（Phase 4 的 audit_logs 補齊為既有已知待辦，不在本次範圍）。

## Open Questions

無。
