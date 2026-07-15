## 1. 型別與 Schema 定義

- [x] 1.1 更新 `shared/types/user.ts`：新增 `username` 欄位、`email`/`phone` 改為 optional、新增 `providers: string[]`
- [x] 1.2 新增 username 格式驗證 utility（`/^[a-zA-Z0-9]{6,8}$/`）至 `shared/utils/validation.ts`
- [x] 1.3 新增 password 格式驗證 utility（`/^[a-zA-Z0-9]{6,8}$/`）至 `shared/utils/validation.ts`

## 2. Server — Users Repo & Service

- [x] 2.1 更新 `server/modules/users/repo.ts`：新增 `findByUsername(username, tenantId)` 查詢方法
- [x] 2.2 更新 `server/modules/users/repo.ts`：`createUser` 接受新 schema（username, providers, email?, phone?）
- [x] 2.3 更新 `server/modules/users/service.ts`：新增 `getUserByUsername` 方法（呼叫 repo）
- [x] 2.4 更新 `server/modules/users/service.ts`：`createUser` 新增 username 唯一性驗證，重複時回傳 conflict error

## 3. Server — Auth Service

- [x] 3.1 更新 `server/modules/auth/service.ts`：`login` 流程支援 username → 查 Firestore → 取合成 email → 驗證 Firebase idToken
- [x] 3.2 更新 `/api/auth/register` handler：接受 username, password, email?, phone?；呼叫 `createUser` service
- [x] 3.3 更新 `/api/auth/login` handler（若有 server-side login endpoint）：驗證 username/password 後建立 session

## 4. Client — useAuth Composable

- [x] 4.1 更新 `composables/useAuth.ts`：`login(username, password)` — 先 POST `/api/users/lookup?username=` 取 syntheticEmail，再 `signInWithEmailAndPassword(syntheticEmail, password)`
- [x] 4.2 更新 `composables/useAuth.ts`：`register(username, password, email?, phone?)` — 建立合成 email，呼叫 `createUserWithEmailAndPassword`，再 POST `/api/auth/register`，最後 `signOut`
- [x] 4.3 更新 `composables/useAuth.ts`：`loginWithGoogle()` — Google sign-in 後 POST `/api/auth/google-login`（回傳 binding / quick-register 狀態）

## 5. Server — Google Provider Binding

- [x] 5.1 新增 `/api/auth/google-login` endpoint：接收 idToken，解出 Google 登入的 Firebase Auth uid，以 uid 查詢 Firestore `users` doc 且 `providers` 含 `'google'`，決定 ready / quick-register 兩種回傳（不比對 email，綁定改由 Profile 頁面主動觸發，見第 9 節）
- [x] 5.2 更新 `server/modules/users/service.ts`：新增 `bindGoogleProvider(userId)` 方法，將 `'google'` 加入 `providers` 陣列

## 6. Client — 登入頁面

- [x] 6.1 更新 `pages/login.vue`：將 email input 改為 username input
- [x] 6.2 更新 `pages/login.vue`：新增 Google 登入按鈕，呼叫 `loginWithGoogle()`
- [x] 6.3 更新 `pages/login.vue`：Google 快速註冊狀態下顯示 username 選擇表單

## 7. Client — 註冊頁面

- [x] 7.1 更新 `pages/auth/register.vue`：username 欄位（必填，6–8 英數字）
- [x] 7.2 更新 `pages/auth/register.vue`：email 欄位改為選填
- [x] 7.3 更新 `pages/auth/register.vue`：新增 phone 欄位（選填）
- [x] 7.4 更新 `pages/auth/register.vue`：password 驗證改為 6–8 英數字規則
- [x] 7.5 更新 `pages/auth/register.vue`：整合 Google 快速註冊流程（帶入 Google email 預填）

## 8. Seed Demo Users

- [x] 8.1 更新 seed 腳本（`scripts/seed-demo-users.ts` 或同等路徑）：所有 demo 帳號改用 username + 合成 email 結構
- [x] 8.2 更新 seed 腳本：每個 demo 帳號包含 `providers: ['password']`，email/phone 視情況填入
- [x] 8.3 驗證 seed 腳本在 dev 環境執行後所有 demo 帳號可正常登入

## 9. Profile 頁面 — 主動綁定 Google Provider

- [x] 9.1 更新 `server/modules/auth/auth.types.ts`：`AuthUser` 新增 `providers: string[]`，並更新 `/api/auth/login`、`/api/auth/me` 回傳值
- [x] 9.2 新增 `server/api/profile/google-provider.patch.ts`：呼叫 `bindGoogleProvider(tenantId, userId)`
- [x] 9.3 更新 `composables/useAuth.ts`：新增 `linkGoogleProvider()`，使用 `linkWithPopup` 綁定後呼叫新 API 並刷新 store
- [x] 9.4 更新 `pages/profile/index.vue`：顯示已綁定登入方式，未綁定 Google 時顯示綁定按鈕
- [x] 9.5 補充 i18n（`profile.loginMethods`、`profile.bindGoogle` 等）

## 10. 驗證與清理

- [x] 10.1 執行 `pnpm lint` 確認無 lint 錯誤
- [x] 10.2 執行 `pnpm build` 確認 TypeScript 編譯通過
- [x] 10.3 手動測試：username/password 註冊 → 登入流程
- [x] 10.4 手動測試：帳號已於 Profile 頁面綁定 Google → 登入頁「以 Google 繼續」以相同 Google 帳號登入 → 直接進入 `/`
- [x] 10.5 手動測試：Google 帳號從未綁定過任何帳號 → 登入頁「以 Google 繼續」→ 進入快速註冊流程
- [x] 10.6 手動測試：Google 帳號已綁定 A 帳號，改用其他未綁定帳號登入後至 Profile 綁定同一 Google 帳號 → Firebase 回傳 `auth/credential-already-in-use`，綁定失敗
- [x] 10.7 手動測試：Profile 頁面綁定 Google（帳號無 email）→ 綁定成功，email 仍為 null
- [x] 10.8 手動測試：Profile 頁面綁定 Google（帳號 email 與 Google email 不同）→ 仍綁定成功
- [x] 10.9 手動測試：Profile 頁面對已綁定 Google 的帳號 → 不顯示綁定按鈕，改顯示已綁定狀態
