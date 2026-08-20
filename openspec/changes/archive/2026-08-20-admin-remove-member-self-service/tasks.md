## 1. 登入/註冊頁移除 LINE 入口

- [x] 1.1 `apps/admin/pages/auth/login/index.vue`：移除「使用 LINE 登入」按鈕、`handleLineLogin` 函式與 `loginWithLineRedirect` 呼叫
- [x] 1.2 刪除 `apps/admin/pages/auth/line-callback/` 整個頁面目錄
- [x] 1.3 `apps/admin/config/app-routes.ts`：移除 `ROUTES.lineCallback` 定義
- [x] 1.4 檢查 `AuthRegisterForm`（`apps/admin` 內）是否僅剩由 `line-callback` 頁面帶入的 `provider="line"` 分支；若無其他呼叫端，移除該分支與相關 prop

## 2. 個人資料頁移除 LINE 綁定與手機號碼

- [x] 2.1 `apps/admin/pages/profile/components/LoginMethodsCard.vue`：移除 LINE 綁定/解除綁定區塊（含 QR Code 彈窗、驗證碼倒數計時邏輯），僅保留 Google 登入方式區塊
- [x] 2.2 `apps/admin/pages/profile/components/ProfileInfoCard.vue`：移除手機號碼顯示欄位、編輯彈窗中的手機號碼輸入欄位與驗證 schema、以及 `PATCH /api/profile/phone` 呼叫邏輯
- [x] 2.3 `apps/admin/composables/useAuth.ts`：確認 `loginWithLineRedirect`、`completeLineLogin`、`generateLineBindCode`、`unlinkLineProvider` 已無呼叫端後移除

## 3. 移除會員資訊頁與我的優惠券頁

- [x] 3.1 刪除 `apps/admin/pages/profile/member-info.vue`
- [x] 3.2 刪除 `apps/admin/pages/profile/coupons.vue`
- [x] 3.3 `apps/admin/config/app-routes.ts`：移除 `ROUTES.memberInfo`、`ROUTES.myCoupons` 定義與對應的側邊導覽項目（`nav.memberInfo`、`nav.myCoupons`）

## 4. 管理員帳號禁止 LINE 邀請綁定

- [x] 4.1 `apps/server/server/api/admin/users/[id]/line-invite.post.ts`：查詢目標帳號角色，角色為 `admin` 或 `superadmin` 時直接拒絕（回傳錯誤），不產生邀請 token；member 角色行為不變
- [x] 4.2 `apps/admin/pages/admin/admin-accounts/index.vue`：角色為 admin/superadmin 的帳號列不顯示（或停用）「產生 LINE 邀請連結」動作
- [x] 4.3 確認 `apps/server/server/modules/identity/identity.invite.ts`（`generateLineInviteToken`）呼叫端已加上角色檢查，不需修改該函式本身邏輯

## 5. 清理殘留參照

- [x] 5.1 全域搜尋 `apps/admin` 中對 `ROUTES.lineCallback` / `ROUTES.memberInfo` / `ROUTES.myCoupons` 的殘留參照（`NuxtLink`、`router.push` 等）並移除
- [x] 5.2 檢查 `apps/admin` 的 i18n 檔案（`en.json` / `zh-TW.json`），移除僅供本次刪除頁面/元件使用的 key（如 `auth.loginWithLine`、`auth.error.lineStateMismatch`、`auth.error.lineLoginFailed`、`profile.lineLogin`、`profile.bindLineFailed`、`profile.unbindLine*`、`profile.lineBindCode*`、`profile.phone*`、`nav.memberInfo`、`nav.myCoupons` 等），逐一確認無其他頁面使用後再刪除
- [x] 5.3 全域搜尋（涵蓋 `apps/liff`、`apps/server`）確認 `apps/admin` 移除的 composable 方法與呼叫的 server API（`/api/auth/line-*`、LINE bind code 相關端點）是否仍被 LIFF 端使用；若仍被使用則保留 server 端實作不動

## 6. 驗證

- [x] 6.1 `pnpm --dir apps/admin lint`
- [x] 6.2 `pnpm --dir apps/admin build`（確認無殘留路由/型別錯誤）
- [x] 6.3 手動於瀏覽器驗證：`/login` 僅顯示帳密登入與 Google 登入、`/profile` 僅顯示保留欄位與 Google 綁定、側邊導覽不再顯示「會員資訊」「我的優惠券」、直接造訪 `/profile/member-info`、`/profile/coupons`、`/auth/line-callback` 均不再可用
- [x] 6.4 `pnpm --dir apps/server test`（若涵蓋 line-invite 相關測試）並手動驗證：對 admin/superadmin 角色帳號呼叫 `POST /api/admin/users/{id}/line-invite` 回傳拒絕，對 member 角色帳號行為不變
