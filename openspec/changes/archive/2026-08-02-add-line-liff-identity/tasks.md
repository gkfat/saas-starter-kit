## 1. Pre-implementation audit

- [x] 1.1 盤點所有讀取 `event.context.userId` / `RequestContext.userId` 的 handler、service、middleware
- [x] 1.2 盤點所有直接呼叫 `modules/auth`、`modules/users` 內部函式（非經 `index.ts`）的呼叫端
- [x] 1.3 確認 Firebase 專案帳單方案（Spark，已確認本次設計不需 Blaze）
- [x] 1.4 安裝 `@line/liff@^2.29.2`（官方套件自帶型別，不需額外補型別套件）

## 2. `user_auth` 資料模型與 `modules/identity`

- [x] 2.1 定義 Firestore `user_auth` collection 結構（doc id = `${provider_type}_${provider_user_id}`）
- [x] 2.2 建立 `server/modules/identity/{index.ts, service.ts, repo.ts, schema.ts, types.ts}`
- [x] 2.3 實作 `identity.service` 的 user ↔ user_auth 解析、綁定、解除綁定邏輯
- [x] 2.4 從 `modules/auth`、`modules/users` 移除重疊的 provider 對應邏輯，改為呼叫 `modules/identity`
- [x] 2.5 後台建立帳號流程改為同步寫入 `user_auth: provider_type = 'password'` doc
- [x] 2.6 username/password 自行註冊流程改為同步寫入 `user_auth(provider_type: 'password')`，移除唯一性檢查對 `users.username` 的查詢，改查 `user_auth` doc id
- [x] 2.7 Google 登入/quick-register/綁定流程改為透過 `user_auth(provider_type: 'google')` 解析，移除 `linkWithCredential` 呼叫與 `users.providers` 陣列讀寫
- [x] 2.8 移除 `users` doc 的 `providers` 欄位（schema、型別、寫入邏輯）

## 3. Firebase uid ↔ internal user_id 對應

- [x] 3.1 實作簽發 custom token（LINE）與 `setCustomUserClaims`（password、google 既有 Firebase uid）時寫入 internal `userId` custom claim
- [x] 3.2 調整 `03.auth.ts`：直接讀取 custom claims 的 `userId` 作為 `event.context.userId`（不保留 Firebase uid fallback）
- [x] 3.3 實作綁定/解除綁定任一 provider（password/google/line）時呼叫 `revokeRefreshTokens`
- [x] 3.4 前端攔截 401 後導向重新登入，並提示「帳號綁定成功，請前往登入」
- [x] 3.5 調整後台停用/刪除帳號流程，改為查詢該 `userId` 底下所有 `user_auth` 對應的 `firebaseUid` 並逐一呼叫 `adminAuth().updateUser`/`deleteUser`/`revokeRefreshTokens`

## 4. LINE 身份驗證與 LIFF 登入 API

- [x] 4.1 實作 LIFF ID Token (JWT) 驗證：簽章、`aud`（channel id）、`exp`
- [x] 4.2 實作 LINE 首次登入 quick-register API（比照 Google quick-register：無對應 `user_auth` 時回傳 `status: 'quick-register'`，不自動建立帳號；`POST /api/auth/line-register {username, idToken}` 由使用者選定 username 後建立 `user` + `user_auth`，指派普通會員角色）
- [x] 4.3 實作 LINE 登入解析既有 `user_auth` 對應既有帳號的 API
- [x] 4.4 `login_log` 寫入新增 `provider: 'line'` 支援（沿用 chapter 2/3 已統一的 `/api/auth/login`，`LoginDto`/`LoginProvider` 已含 `'line'`）

## 5. 帳號綁定流程

- [x] 5.1 實作「已登入帳號綁定 LINE」API：要求有效 idToken 驗證所有權（`PATCH`/`DELETE /api/profile/line-provider`）
- [x] 5.1b 實作短時效 bind code 跨 app 銜接（見 design.md Decision 12）：`POST /api/profile/line-bind-code`（受保護，產生 6 位數字/5 分鐘過期/一次性 code）與 `POST /api/auth/line-bind-code-activate`（公開，`{code, idToken}` 完成綁定）
- [x] 5.2 SaaS 前端帳號設定頁新增「綁定 LINE」入口：呼叫 5.1b 產生 bind code 並顯示為文字（`LoginMethodsCard.vue`，含倒數計時；未做 QR code，純數字碼即可滿足配對用途）
- [x] 5.3 實作邀請連結 token 產生 API（`expiresAt` = 發出後 24 小時、`usedAt`）
- [x] 5.4 實作邀請連結啟用+綁定 API：驗證 token 未過期、未使用，成功後標記 `usedAt`
- [x] 5.5 後台帳號管理頁新增「產生 LINE 綁定邀請連結」功能（`UsersTable.vue` 新增按鈕 + `SetupLinkDialog` 複用顯示連結）
- [x] 5.6 邀請連結啟用流程新增重複帳號偵測：LINE `provider_user_id` 已綁定其他 `userId` 時，彈出「您已註冊過帳號，將直接登入」警告並登入既有帳號，邀請目標帳號維持孤立不動

## 6. LIFF 前端頁面

> 前置條件：`add-liff-app-deployment` change 已完成 LIFF app 骨架建立

- [x] 6.1 整合 `@line/liff` SDK，實作 LINE Login、取得 ID Token（`utils/liff-client.ts`；開發模式下若有 `VITE_LIFF_ACCESS_TOKEN` 則略過 `liff.init()`/`liff.login()`，直接以該值作為 LINE ID Token 供一般瀏覽器開發除錯，因 `liff.init()` 不接受 `http://localhost` 作為註冊的 LIFF endpoint URL）
- [x] 6.2 實作 LIFF 登入頁（`LoginPage.vue`：既有帳號登入由 `/api/auth/line-login` 透明處理；無對應帳號則導向 `RegisterPage.vue` 讓使用者選 username 後呼叫 `/api/auth/line-register` 建立帳號，比照 admin 端 Google quick-register 的模式）、邀請連結啟用頁（`InvitePage.vue`，含重複帳號警告）、bind 頁（`BindPage.vue`，輸入 bind code 完成已登入帳號綁定）
- [x] 6.3 串接既有 Authorization Bearer idToken 機制：`line-auth-flow.ts` 以 custom token 換取 Firebase idToken 後，統一走 `/api/auth/login`，與 password/Google 登入共用同一收尾流程
- [x] 6.4 新增 `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` 至 server 端 `.env.example`（順帶新增 `VITE_LIFF_ID` 供 6.1 使用）

## 7. 驗證與收尾

- [x] 7.0 修正 chapter 2/3 遺留回歸：`/api/auth/login` 改走 idToken 後，`02.rate-limit.ts` 仍讀取舊契約的 `body.identifier` 組帳號維度鎖 key，導致 key 恆為空字串（所有使用者共用同一把鎖）且帳號密碼驗證已下放給 Firebase、伺服器端已無法辨識「這次是哪個帳號」。改為僅保留 IP 維度限流（適用所有 provider），並在 `login.post.ts` 登入成功後 `resetOnSuccess('login:ip:...')`
- [x] 7.1 撰寫/更新測試：LIFF ID Token 驗證、user_auth 綁定唯一性、邀請 token 過期/一次性（`tests/line-identity.test.ts`；真實 LINE/Google OAuth 端到端流程因缺乏可用憑證未涵蓋，已於檔案頂部註明）
- [x] 7.2 撰寫/更新測試：username/password 註冊登入 走新 `user_auth` 流程（`tests/rate-limit.test.ts` 重寫）；Google quick-register/登入/綁定 因缺乏真實 OAuth 憑證未涵蓋，已於檔案頂部註明
- [x] 7.3 清空開發環境 Firestore 既有帳號資料，依新流程重新建立測試帳號（superadmin 帳號另行確認不受影響）——已執行，僅保留 superadmin，未另建新測試帳號（使用者選擇）
- [x] 7.4 確認 `pnpm build`、`pnpm lint`、`pnpm test` 全數通過（三個 app 皆過；順帶修正 `scripts/seed-superadmin.ts`、`scripts/seed-demo-users.ts` 沿用的舊 schema，並刪除已無人使用的 `shared/crypto.ts`）

## 8. 個人中心變更密碼

- [x] 8.1 新增 `PATCH /api/profile/password`：已有 `user_auth(provider=password)` 時驗證帶入 idToken 的 uid 與既有 `firebaseUid` 一致後 `adminAuth().updateUser`；無 password provider 時 `adminAuth().createUser()` + `bindProvider('password', username, newFirebaseUid)`；兩種情況成功後皆 `revokeSessionsForUser`
- [x] 8.2 `apps/admin/composables/useAuth.ts` 新增 `changePassword()`：已有密碼時內部先呼叫 `signInWithEmailAndPassword` 取得驗證用 idToken 再打 API；無密碼時直接打 API
- [x] 8.3 `apps/admin` 個人中心新增「變更密碼」表單（含 i18n 文案），依帳號是否已有 password provider 顯示對應欄位（是否需要輸入目前密碼）
- [x] 8.4 測試：已有密碼變更成功／舊密碼錯誤／LINE-only 帳號直接設定新密碼三種情境（`tests/change-password.test.ts`）

## 9. Admin LINE Login Web OAuth

- [x] 9.1 從 `line-login.post.ts` 抽出共用 service 函式（識別身份、查 `user_auth`、回傳 `ready`/`quick-register`），供 LIFF 與 admin 兩個 endpoint 共用（`modules/identity/identity.line.ts` 的 `resolveLineLogin`）
- [x] 9.2 新增 `POST /api/auth/line-callback`：以 `code` + `redirectUri` 向 LINE token endpoint 換 `id_token`（需 `channelSecret`），驗證後呼叫 9.1 的共用函式
- [x] 9.3 Admin 登入頁新增「使用 LINE 登入」按鈕，導向 LINE `/oauth2/v2.1/authorize`（`state` 存 `sessionStorage` 防 CSRF）
- [x] 9.4 新增 `apps/admin/pages/auth/line-callback/index.vue`：驗證 `state`、呼叫 9.2 API，`ready` 則 `signInWithCustomToken` 完成登入；`quick-register` 則導向註冊表單
- [x] 9.5 `apps/admin/components/auth/RegisterForm.vue` 擴充支援 `provider: 'line'`（沿用既有 `/api/auth/line-register`），不只支援 Google
- [x] 9.6 `.env.example` 補充說明：admin 的 LINE Login callback URL 需另外於 LINE Developers Console 設定
- [x] 9.7 測試：缺少必要欄位、無效 authorization code 的錯誤處理（`tests/line-callback.test.ts`；真實 LINE OAuth 端到端流程因缺乏可用憑證未涵蓋，已於檔案頂部註明）
