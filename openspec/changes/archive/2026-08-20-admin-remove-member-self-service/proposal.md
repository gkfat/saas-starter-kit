## Why

`apps/admin` 目前混雜了「一般會員自助服務」與「管理員後台管理」兩種功能。後台的定位應僅限管理員（admin / superadmin）登入使用，會員自助服務（LINE 登入/註冊、查看個人會員資訊、查看我的優惠券等）屬於 `apps/liff` 的職責。移除這些混雜功能可以縮小後台的攻擊面與維護成本，並讓兩個前端的職責邊界清楚。

## What Changes

- **BREAKING**: 移除 `apps/admin` 登入頁 (`/login`) 的「使用 LINE 登入」按鈕與對應的 `handleLineLogin` 邏輯
- **BREAKING**: 移除 `apps/admin` 的 LINE OAuth callback 頁面 (`/auth/line-callback`) 與其路由
- **BREAKING**: 移除個人資料頁 (`/profile`) 中 `LoginMethodsCard` 的 LINE 綁定/解除綁定功能（含綁定用 QR Code / 驗證碼彈窗），僅保留 Google 登入方式的綁定/解除綁定
- **BREAKING**: 移除個人資料頁 `ProfileInfoCard` 中的手機號碼顯示欄位與編輯彈窗中的手機號碼輸入欄位，及對應的 `PATCH /api/profile/phone` 呼叫
- **BREAKING**: 移除會員資訊頁 (`/profile/member-info`) 頁面與其導覽項目
- **BREAKING**: 移除我的優惠券頁 (`/profile/coupons`) 頁面與其導覽項目
- 移除 `apps/admin` 專屬的 `ROUTES.lineCallback` / `ROUTES.memberInfo` / `ROUTES.myCoupons` 路由定義與側邊導覽項目
- 若移除後 `AuthRegisterForm` 內僅剩密碼註冊路徑，確認並清理其中僅供 LINE quick-register 使用（`provider="line"`）的專屬邏輯
- **BREAKING**: `POST /api/admin/users/{id}/line-invite` SHALL 在目標帳號角色為 admin 或 superadmin 時拒絕產生 LINE 邀請連結（即使操作者具備 `AdminAccounts.Write` 權限）；member 角色帳號不受影響，維持可產生邀請連結供該會員於 LIFF 端綁定 LINE
- admin-accounts 頁面 (`/admin/admin-accounts`) 對角色為 admin/superadmin 的帳號列不再顯示「產生 LINE 邀請連結」動作

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `auth`: 移除「LINE Login via Web OAuth in admin app」需求；admin app 不再支援 LINE 登入
- `line-liff-identity`: Purpose 與「Binding LINE to an existing password-based account」需求收斂為僅適用於 LIFF 前端，移除 admin app Web OAuth 相關敘述；「Invite-link activation for accounts never logged in」需求收斂為僅適用於 member 角色帳號，admin/superadmin 角色帳號不適用邀請連結啟用流程

## Impact

- **Affected code**:
  - `apps/admin/pages/auth/login/index.vue`（移除 LINE 登入按鈕）
  - `apps/admin/pages/auth/line-callback/`（整頁移除）
  - `apps/admin/pages/profile/components/LoginMethodsCard.vue`（移除 LINE 區塊）
  - `apps/admin/pages/profile/components/ProfileInfoCard.vue`（移除手機號碼欄位）
  - `apps/admin/pages/profile/member-info.vue`（整頁移除）
  - `apps/admin/pages/profile/coupons.vue`（整頁移除）
  - `apps/admin/config/app-routes.ts`（移除對應路由與導覽項目）
  - `apps/admin/composables/useAuth.ts` 中僅供 admin LINE 登入/綁定使用的方法（`loginWithLineRedirect`、`completeLineLogin`、`generateLineBindCode`、`unlinkLineProvider`，需確認是否仍被 LIFF 或其他頁面共用後再移除）
  - `apps/admin/pages/admin/admin-accounts/index.vue`（admin/superadmin 角色列移除「產生 LINE 邀請連結」動作）
- **Server-side**: `apps/server` 的 LINE 相關 API（`/api/auth/line-*`、LINE bind code 產生）若僅供 admin app 使用則一併評估移除；若 LIFF 仍需使用則保留，不在此變更範圍內刪除
  - `apps/server/server/api/admin/users/[id]/line-invite.post.ts` 新增目標帳號角色檢查，admin/superadmin 角色一律拒絕
- **Not affected**: `apps/liff` 的會員自助服務（個人資料、會員卡、我的優惠券）不受影響；`/admin/members`、`/admin/coupons` 等管理員管理頁面不受影響
