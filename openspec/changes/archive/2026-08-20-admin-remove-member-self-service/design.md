## Context

`apps/admin` 目前同時承載「管理員後台」與「一般會員自助服務」（LINE 登入/註冊、手機號碼綁定、會員資訊查看、優惠券查看）。這些會員自助功能與 `apps/liff` 的職責重複，且不符合「後台僅供管理員登入」的定位。本次為純前端刪除變更，不涉及新架構或資料模型調整，故 design 內容以「刪除範圍與驗證方式」為主。

## Goals / Non-Goals

**Goals:**

- 移除 `apps/admin` 中僅供一般會員使用的頁面、元件與路由
- 移除 `apps/admin` 登入頁的 LINE 登入入口，僅保留帳密登入與 Google 登入
- 個人資料頁僅保留管理員仍需要的資訊（username、email、displayName、role、密碼變更、Google 登入綁定）
- 確認刪除後不遺留死路由、死連結、未使用的 i18n key、未使用的 composable 方法

**Non-Goals:**

- 不變更 `apps/liff` 的任何會員自助服務功能
- 不變更 `/admin/members`、`/admin/coupons` 等管理員管理頁面
- 不評估或執行 `apps/server` LINE 相關 API 的移除（是否仍被 LIFF 使用需先確認，超出本次前端變更範圍；若確認未使用可留待後續 change 處理）
- 不新增任何功能或重構既有保留邏輯

## Decisions

- **僅刪除 admin app 檔案，不動 server 端**：`apps/server` 的 `/api/auth/line-*`、LINE bind code 相關 API 可能仍被 `apps/liff` 使用（LINE LIFF 登入本就需要這些端點），因此本次僅移除 `apps/admin` 前端呼叫這些 API 的入口，不刪除 server 端實作，避免誤刪共用邏輯
- **`useAuth.ts` 中 LINE 相關方法直接刪除**：已確認 `apps/admin/composables/useAuth.ts` 為 admin app 專屬 composable（非 monorepo 共用），`loginWithLineRedirect`、`completeLineLogin`、`generateLineBindCode`、`unlinkLineProvider` 僅被本次移除的頁面/元件呼叫，可安全整批刪除
- **`AuthRegisterForm` 的 `provider="line"` 分支評估後移除**：僅由 `/auth/line-callback` 頁面帶入，該頁面整頁移除後此 prop 分支即為死碼，一併清理；密碼註冊路徑不受影響
- **spec 變更採用最小增量**：僅修改 `auth`、`line-liff-identity` 兩份既有 spec 中明確描述「admin app LINE Web OAuth」的需求段落，不觸碰與 LIFF 相關、本次未變動的需求
- **LINE 邀請連結以「目標帳號角色」把關，而非僅靠操作者權限**：目前 `line-invite.post.ts` 只用操作者權限（`Members.Write` / `AdminAccounts.Write`）決定能否觸發，未限制「被產生邀請連結的帳號」本身的角色。管理員帳號（admin/superadmin）定位為僅供帳密登入的內部帳號，不應再透過 LINE 綁定登入，因此改為在 service 層依「目標帳號角色」硬性擋下：角色為 admin/superadmin 時，無論操作者權限為何一律拒絕；member 角色帳號不受影響，因為該邀請連結是給會員在 `apps/liff` 端使用，屬於會員自助服務範疇，不在本次「後台移除會員功能」的移除範圍內

## Risks / Trade-offs

- [誤刪仍被共用的 server API 或 composable 方法] → 實作階段先以全域搜尋（grep）確認 `apps/admin` 以外（`apps/liff`、`apps/server`）無其他呼叫端再刪除；server 端 API 本次不刪除
- [遺漏導覽項目或路由參照造成 404 死連結] → 刪除頁面後同步搜尋 `app-routes.ts`、任何 `NuxtLink`/`router.push` 對已移除路由的參照
- [i18n key 變成孤兒] → 刪除頁面/元件後檢查 `en.json`、`zh-TW.json` 中僅供這些頁面使用的 key（如 `profile.lineLogin`、`profile.phone*`、`nav.memberInfo`、`nav.myCoupons` 等），確認無其他頁面使用後移除

## Migration Plan

- 純前端刪除，無資料庫遷移
- 部署後既有使用者若透過收藏連結造訪 `/profile/member-info`、`/profile/coupons`、`/auth/line-callback`，將因路由不存在而導向 404 或 Nuxt 預設錯誤頁，屬預期行為（無需保留重導向，因後台不再對一般會員開放）
- Rollback：還原本次 commit 即可，無需額外資料還原
