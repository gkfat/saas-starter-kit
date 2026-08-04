## Context

現有系統採「單一 Firebase Auth uid = 一個人」模型：`users` Firestore doc 的 doc id 即為 Firebase uid，Google 等 Firebase 原生支援的 provider 透過 `linkWithCredential` 綁定到同一 uid，並在 `providers: string[]` 欄位記錄（見 `account-provider-binding` spec）。

LINE Login 並非 Firebase Auth 原生支援的 provider（若要走原生模式需將 LINE 設為 Identity Platform 的通用 OIDC provider，並要求 Blaze 付費方案）。本次變更選擇不依賴該路徑，改由後端自行維護一套獨立於 Firebase Auth 之外的多 provider 身份對應機制（`user` / `user_auth` 拆分）。

專案目前仍在開發階段、無正式環境資料，既有帳號可直接清空重建。因此本次變更順勢將 Google、username/password 一併納入同一套 `user_auth` 模型，取代現有 `linkWithCredential` + `providers` 陣列機制，讓系統內只存在一套身份對應邏輯，而非讓 `user_auth`（LINE 專用）與原生 provider linking（Google/password）兩套機制長期並存。若專案已有正式環境資料，這個決定會需要重新評估（既有 Google 原生連結帳號一旦 `linkWithCredential` 過，無法拆出原本各自獨立的 uid，將是破壞性遷移）。

LINE LIFF 前端 app 的骨架建立、Firebase 多 Hosting targets 部署、CI/CD pipeline 調整，已拆分至獨立 change `add-liff-app-deployment`；本 change 的登入/註冊/綁定頁面需建立在該 change 產出的 app 骨架之上。

## Goals / Non-Goals

**Goals:**

- 讓使用者能透過 LIFF 完成 LINE 註冊/登入，並與既有帳號（後台建立或 SaaS 自行註冊）互相綁定
- 已設密碼帳號綁定 LINE 前，必須先以密碼登入證明所有權，防止帳號劫持
- 後台建立但未啟用（無密碼登入紀錄）的帳號，可透過一次性邀請連結，於 LIFF 內以 LINE 登入完成啟用＋綁定
- `event.context.userId` 改為 internal user_id，讓多 provider 對應同一人的邏輯集中在 `modules/identity`
- Google、username/password 一併改走 `user_auth` 模型，移除 `linkWithCredential` + `providers` 陣列機制，系統內僅維持單一身份對應邏輯
- 已有密碼的帳號可在個人中心自行變更密碼；尚無密碼的帳號（如 LINE-only）可在個人中心自行設定密碼，取得帳密登入能力
- Admin 前台使用者可直接以 LINE Login 登入，不侷限於 LIFF（app-embedded）環境

**Non-Goals:**

- 不評估或導入 Firebase Blaze 專用的 Identity Platform 通用 OIDC provider 路徑
- 不處理正式環境的既有帳號遷移（假設可直接清空開發環境資料重建；若專案已上線有真實使用者資料，需另外評估遷移方案）
- 不自動合併或刪除「LINE 身份先註冊、後台又手動建立重複帳號」情境下產生的孤立重複帳號（僅偵測並導回原帳號，重複帳號本身維持孤立、需後台人工處理）
- 不處理 LIFF 前端 app 骨架、Firebase 多 Hosting targets、CI/CD pipeline（見獨立 change `add-liff-app-deployment`）

## Decisions

### 1. `user` / `user_auth` 資料模型拆分

新增 Firestore `user_auth` collection，doc id 為 `${provider_type}_${provider_user_id}`（例如 `line_U1234...`），內容至少包含 `{ userId, providerType, providerUserId, firebaseUid, createdAt }`。`firebaseUid` 記錄該 provider 綁定當下實際簽發/對應的 Firebase Auth uid，與 `providerUserId` 分開存——password 的 `providerUserId` 是 username、line 的 `providerUserId` 是 LINE userId，兩者皆與各自的 Firebase uid 不同；只有 google 恰好兩者相同（Google 登入的 Firebase uid 本身即拿來當 `providerUserId`）。持久化 `firebaseUid` 讓後續可依 `userId` 反查一個帳號底下所有 provider 對應的 Firebase uid，供 revoke/停用/刪除等操作使用（見 Decision 11）。唯一性由 doc id 天然保證，寫入前僅需一次 `get` 判斷是否已存在，不需 transaction。

帳號建立時（不論後台建立或使用者自行以 username/password 註冊），同步寫入 `user_auth` doc：`provider_type = 'password'`，`provider_user_id = username`（doc id 為 `password_{username}`，天然取代原本另外查詢 `users.username` 是否重複的唯一性檢查）。Google 登入則寫入 `provider_type = 'google'`，`provider_user_id` 為 Google 登入產生的 Firebase uid。

**Alternatives considered**：獨立 collection + composite 欄位查詢 + transaction 保證唯一 — 實作更複雜，且與現行 repo 層慣例（單一 doc 操作）不一致，予以放棄。

### 2. `modules/identity` 取代 `modules/auth` / `modules/users` 的重疊邏輯

- `modules/identity`：owns `user` ↔ `user_auth` 對應、provider 綁定/解除綁定、邀請 token 產生與驗證
- `modules/auth`：僅負責 token 驗證（Firebase idToken、LIFF ID Token）與 custom token 簽發，不再直接操作 provider 對應資料
- `modules/users`：僅負責會員基本資料屬性（暱稱、頭像等），不涉及登入方式

跨模組呼叫一律走各自 `index.ts`（沿用現有規範）。

### 3. Firebase uid 對應：custom claims 存 internal user_id

每個 provider 各自持有獨立 Firebase uid：LINE 登入透過 Admin SDK `createCustomToken` 產生一組新 uid；username/password 走 Firebase Auth 原生 email/password 登入所使用的 uid；Google 登入不再呼叫 `linkWithCredential`，保留 Firebase 回傳的 Google 原生獨立 uid。三者皆在 `modules/identity` 完成綁定時，透過 Admin SDK `setCustomUserClaims` 將解析出的 internal `userId` 寫入該 Firebase uid 的 custom claims；`03.auth.ts` 的 `verifyIdToken` 結果直接取用該 claim 作為 `event.context.userId`，不需額外查 Firestore。

**Trade-off**：custom claims 不會即時反映在既有 idToken 上（需等待 idToken 過期或前端強制 `getIdToken(true)` 刷新）。因此綁定/解除綁定任一 provider 時，後端同步呼叫 `revokeRefreshTokens`，前端收到後續請求 401 後導向重新登入。

**Alternatives considered**：每次 request 額外查 Firestore 取得 internal user_id — 一致性最高但每個受保護 API 都多一次讀取延遲與成本，予以放棄。

### 4. LINE 身份驗證：驗證 LIFF ID Token (JWT)，不呼叫 LINE profile API

後端僅驗證 LIFF SDK 回傳的 ID Token 簽章、`aud`（channel id）、`exp`，避免多一次對外 API 呼叫的延遲與失敗點。LINE `channel id` / `channel secret` 比照現有 `FIREBASE_*` 做法，存放於 server 端專用 `.env`，不進版控。

**修正（實測發現）**：原實作以為 LINE ID Token 一律用 ES256（非對稱）簽章，改用 `jose` 的 `createRemoteJWKSet`（`https://api.line.me/oauth2/v2.1/certs`）驗證，且從未有真實 LINE 登入端到端測過（見 `tests/line-identity.test.ts` 檔頭註記）。實際在加入 admin Web OAuth 登入、第一次真實跑通整個流程時發現：本專案使用的 channel 簽出的 ID Token 其實是 **HS256**（對稱，用 channel secret 做 HMAC），`createRemoteJWKSet` 完全無法驗證 HS256 token，導致 `verifyLineIdToken` 一律拋出 `Unsupported "alg" value for a JSON Web Key Set`——也就是說 LIFF 登入這條路徑此前實際上從未真正可用。已改為以 `channelSecret` 做 HMAC-SHA256 驗證（`jwtVerify(idToken, new TextEncoder().encode(channelSecret), {...})`），`channelSecret` 因此從「保留但未使用」變成 ID Token 驗證與 admin Web OAuth code exchange 兩者皆必要，`getLineProviderConfig()` 也同步改為缺少 `channelSecret` 時直接拋錯。

### 5. 帳號綁定安全性：已設密碼帳號必須先登入才能綁定 LINE

已有密碼的帳號，綁定 LINE 前端入口要求使用者先以密碼登入（取得有效 idToken），再呼叫綁定 API 並帶上該 idToken 驗證所有權。**不**採用「LINE email 與帳號 email 相符即自動綁定」的方式，因為任何人只要知道對方 email 就能用自己的 LINE 帳號綁上去、造成帳號劫持。

### 6. 未啟用帳號：一次性邀請連結 token 完成啟用＋綁定

未曾登入過（僅有 `user_auth: password` 但無登入紀錄）的帳號，透過帶 token 的邀請連結來配對身份。Token 存於 Firestore，含 `expiresAt`（發出後 24 小時過期）與 `usedAt`（使用後標記失效，防止重複使用），比照現有 OTP / 邀請機制的做法。

### 7. Session / 網路：沿用既有 Authorization Bearer idToken 機制

現有 `03.auth.ts` 讀取 `Authorization: Bearer <idToken>`，非 cookie-based，因此 LIFF in-app browser 的第三方 cookie 限制不構成影響，前端行為與 SaaS 前端一致。

### 9. Google 登入改走 `user_auth` 模型，移除原生 `linkWithCredential`

Google 登入不再呼叫 `linkWithCredential` 綁到 username/password 帳號的同一 uid，改為保留 Google 登入自然產生的獨立 Firebase uid，透過 `user_auth(provider=google)` 對應到 internal `userId`（與 LINE 的處理方式一致）。

連動調整：

- `users` doc 移除 `providers: string[]` 欄位
- 既有「依 uid 比對 `providers` 是否包含 `'google'`」的登入/quick-register 判斷邏輯，改為查詢 `user_auth` 是否存在 `google_{uid}` doc
- 帳號設定頁「綁定 Google 帳號」流程改為：Google 登入取得其獨立 uid → 呼叫綁定 API → 建立 `user_auth(provider=google)` → `revokeRefreshTokens` → 提示重新登入
- 因無正式環境資料，不需為既有 Google 綁定帳號寫遷移腳本；開發環境現有測試帳號直接清空重建

**Alternatives considered**：僅新增 `user_auth` 表示既有 `linkWithCredential` 綁定（不改變 Firebase 端行為，Google 與 password 仍共用同一 uid）— 改動範圍較小，但会讓「一個 provider 對應一個獨立 uid」這條規則出現例外（password 與 google 例外地共用 uid），造成 `modules/identity` 的解析邏輯要處理兩種情況，增加日後維護的心智負擔；在無需相容既有資料的前提下，予以放棄，改採與 LINE 一致的單一規則。

### 10. 反向重複帳號：邀請連結偵測已存在的 LINE 身份，導回原帳號並將重複帳號保持孤立

情境：使用者先透過 LIFF 自行以 LINE 登入註冊（已有 `user_auth: line` 綁定），後台不知情又手動為同一人另外建立一個新帳號並產生邀請連結。使用者在 LIFF 內開啟該邀請連結、以 LINE 登入完成「啟用」時，系統依 LINE `provider_user_id` 查到 `user_auth` 已存在對應的（另一個）`userId`。

此時系統 **不** 將邀請連結指向的新帳號與既有帳號合併或綁定，而是：

1. 彈出警告視窗：「您已註冊過帳號，將直接登入」
2. 直接以既有 `user_auth: line` 對應的原帳號完成登入
3. 邀請連結對應的後台新建帳號維持孤立狀態（不刪除、不停用、不合併），由後台人工後續處理

**Rationale**：避免在未經後台確認的情況下自動合併/刪除資料造成誤判；孤立帳號的清理屬於營運流程，非系統自動化範圍。

**Alternatives considered**：自動將孤立帳號標記為 disabled/duplicate — 增加額外狀態欄位與後台介面改動，且合併判斷本身有風險（後台建立的帳號可能本來就是刻意要給不同人使用、只是恰好邀請連結給錯人），予以放棄，留待後續視營運需求再評估。

### 11. 後台停用／刪除帳號需列舉並逐一處理多個 Firebase uid

現行後台「停用帳號」「刪除帳號」直接對單一 Firebase uid 呼叫 `adminAuth().updateUser(uid, { disabled })` / `adminAuth().deleteUser(uid)`，且該 uid 即為 `users` doc id。拆分 `user`/`user_auth` 後，一個 internal `userId` 可能對應多個獨立 Firebase uid（password/google/line 各自獨立）。

因此後台停用/刪除帳號時，需先以 `userId` 查詢 `modules/identity` 取得該帳號底下所有 `user_auth` 記錄的 `firebaseUid`，對每一個 firebaseUid 逐一呼叫 `adminAuth().updateUser`/`deleteUser`（及對應的 `revokeRefreshTokens`），而非只操作單一 uid。刪除 `user_auth` 記錄與 `users` doc 本身則透過 `modules/identity`/`modules/users` 各自的刪除函式處理。

**Alternatives considered**：僅停用/刪除第一個查到的 uid — 會讓帳號底下其他 provider 的 Firebase uid 仍可簽發有效 idToken 並取得未過期的 custom claims，造成停用/刪除不完整、產生安全漏洞，予以放棄。

### 12. SaaS/admin 前端「已登入帳號綁定 LINE」的跨 app 銜接：短時效 bind code

`綁定 LINE` 的實際 LINE Login 互動只能發生在 `apps/liff`（僅該處具備 `@line/liff` SDK 與 channel context），但發起綁定的是已登入 `apps/admin`（或未來 SaaS 前端）的使用者。兩個獨立部署、獨立網域的 app 之間不透過共享 session 或在 URL 帶 idToken 傳遞身份，改採短時效配對碼：

1. 已登入前端呼叫新 API `POST /api/profile/line-bind-code`（受保護，讀取 `event.context.userId`），產生一組 6 位數字、5 分鐘過期、一次性的 bind code，存於 Firestore `line_bind_codes/{code}`：`{ code, userId, expiresAt, usedAt, createdAt }`，回傳給前端顯示為文字/QR code
2. 使用者於 LINE App 內開啟 LIFF 的 bind 頁，輸入或掃描該 code
3. LIFF 頁完成 LINE Login 取得 LINE ID Token 後，呼叫新公開 API `POST /api/auth/line-bind-code-activate`（body: `{ code, idToken }`），伺服器驗證 code 未過期/未使用、解析出目標 `userId`，比照 Decision 5 的綁定邏輯建立 `user_auth(provider_type: 'line')`、呼叫 `revokeRefreshTokens`、標記 code `usedAt`
4. LIFF 頁顯示「綁定成功，請回到原本頁面重新登入」；原本已登入前端不會自動感知綁定完成，需使用者手動返回並重新登入（與其他 provider 綁定後「請重新登入」的既有 UX 一致）

**Alternatives considered**：直接把已登入前端的 Firebase idToken 放進導向 LIFF 的 URL query param — 實作最簡單、不需新增資料模型，但 idToken 會留在瀏覽器歷史記錄、referrer、伺服器存取記錄中，且 token 在效期內（預設 1 小時）被擷取即可重放冒用，安全性明顯較差；予以放棄，改採短時效、一次性、僅供配對用途的 bind code。

### 13. 個人中心變更密碼：以 Client SDK 重新登入取得 idToken 證明所有權

Admin SDK 無法驗證密碼（只能覆寫），因此「已有密碼」與「尚無密碼」兩種情況採不同流程：

- **已有 `user_auth(provider=password)`**：前端先呼叫 Client SDK `signInWithEmailAndPassword`（沿用現有登入邏輯所用的 synthetic email 推導方式）以目前密碼重新登入，取得新的 idToken 作為「所有權證明」，連同新密碼一起送到 `PATCH /api/profile/password`；伺服器驗證該 idToken 的 uid 與該帳號 `user_auth(provider=password)` 記錄的 `firebaseUid` 一致後，才呼叫 `adminAuth().updateUser(firebaseUid, { password: newPassword })`
- **尚無 `user_auth(provider=password)`**（如 LINE-only 帳號）：無密碼可重新登入驗證，前端直接帶新密碼呼叫同一 endpoint；伺服器依 Decision 1 的規則以 `adminAuth().createUser()` 建立一組新的獨立 Firebase uid，寫入 `user_auth(provider_type: 'password', provider_user_id: username)`

兩種情況成功後皆呼叫 `revokeRefreshTokens`（比照 Decision 3 綁定/解除綁定的既有慣例），前端提示重新登入。

**Alternatives considered**：伺服器端呼叫 Identity Toolkit REST API（`accounts:signInWithPassword`）驗證舊密碼 — 需要額外管理 `FIREBASE_WEB_API_KEY` 這個新的 server 端密鑰，且與現有「Client SDK 負責身份驗證、Admin SDK 負責寫入」的架構分工不一致，予以放棄。

### 14. Admin LINE 登入：Web OAuth code exchange，解析邏輯與 LIFF 共用同一 service 函式

Admin 是一般瀏覽器頁面而非 LINE App 內嵌的 LIFF 環境，無法使用 `liff.getIDToken()`。改採標準 LINE Login Web OAuth：導向 `/oauth2/v2.1/authorize` 取得 `code` → 新 endpoint `POST /api/auth/line-callback` 在 server 端以 `channelSecret` 向 LINE token endpoint 換 `id_token`（`channelSecret` 不可下發到瀏覽器，故此步驟只能在 server 端進行）。

換到 `id_token` 後，「查 `user_auth` → 已綁定回傳 `ready` + customToken／未綁定回傳 `quick-register`」的判斷邏輯，從 `line-login.post.ts` 抽成 `modules/auth` 或 `modules/identity` 的共用函式（例如 `resolveLineLogin(idToken)`），供 `line-login.post.ts`（LIFF，直接拿 idToken）與 `line-callback.post.ts`（admin，code exchange 換來的 idToken）兩個 endpoint 各自呼叫，避免重複實作同一段判斷邏輯。`quick-register` 完成註冊沿用既有 `POST /api/auth/line-register`（本就與 idToken 來源無關，兩邊皆可直接沿用）。

**Alternatives considered**：合併成單一 endpoint，依 body 是否帶 `code` 或 `idToken` 分支處理 — 會讓 handler 內出現「這次是 LIFF 還是 web」的分支判斷，違反現有「`api/` handler 保持 thin」的慣例，且兩者輸入契約本質不同（一個信任 SDK 直接給的 idToken、一個需要 server 端 secret 換 token），予以放棄，改為兩個薄 endpoint 共用同一底層 service 函式。

## Risks / Trade-offs

- **[Risk] custom claims 更新非即時** → 綁定/解除綁定時同步 `revokeRefreshTokens`，前端攔截 401 導向重新登入，並在 UX 上提示「帳號綁定成功，請前往登入」
- **[Risk] `modules/identity` 取代既有邊界，影響範圍大** → 需先盤點所有讀取 `event.context.userId` / 呼叫 `modules/auth`、`modules/users` 現有函式的位置，逐一確認語意變更後的相容性，列入 tasks 的前置盤點步驟
- **[Risk] Google/password 一併改走 `user_auth`，屬於破壞性變更，開發環境既有帳號全部失效** → 專案仍在開發階段、可接受，需通知所有開發者清空本機/測試 Firestore 資料並重新建立測試帳號；若未來要在正式環境套用此決策，需重新評估遷移方案
- **[Risk] 每個 provider 各自獨立 Firebase uid，可能造成 Firebase Auth 使用者數量增長（一人多 uid）** → 屬於刻意取捨（見 Decision 3、9），非本次要解決的問題，僅記錄影響
- **[Risk] 邀請連結 token 外洩風險（連結被轉發給非本人）** → token 一次性使用，24 小時後過期；綁定完成後立即 `usedAt` 標記失效
- **[Risk] 後台重複建立帳號情境下產生的孤立帳號會持續累積** → 目前不自動清理、也不在本次變更提供清理介面（見 Decision 10），已確認為刻意決定，非本次範圍
- **[Risk] LINE token endpoint code exchange 可能失敗（code 過期、重複使用、網路錯誤）** → `line-callback.post.ts` 對換 token 失敗回傳明確 401/400 錯誤，前端導回登入頁並提示重試，不重試 code（LINE 的 authorization code 為一次性）
- **[Risk] Admin Web OAuth 的 callback URL 需另外在 LINE Developers Console 手動設定** → 屬於本 change 程式碼範圍外的人工步驟，需於部署文件註明，遺漏會導致 LINE 登入按鈕在該環境無法使用

## Migration Plan

因專案仍在開發階段、無正式環境資料，不需相容模式或漸進式 fallback，直接一次性切換：

1. 新增 `user_auth` collection 與 `modules/identity`
2. 調整 `03.auth.ts`：直接讀取 custom claims 的 internal `userId` 作為 `event.context.userId`（不保留 Firebase uid fallback）
3. 盤點並修正所有讀取 `RequestContext.userId` 的呼叫端，改為使用 internal user_id 語意
4. 改寫 username/password 註冊、Google 登入/綁定流程，改為同步寫入對應 `user_auth` doc；移除 `users` doc 的 `providers` 欄位
5. 實作 LINE 註冊/登入/綁定/啟用 API 與前端頁面（建立在 `add-liff-app-deployment` 產出的 app 骨架之上）
6. 清空開發環境現有 Firestore 帳號資料，依新流程重新建立測試帳號（superadmin 不受影響）

**Rollback**：這是開發階段的一次性切換，若發現問題直接回退對應 commit/branch 即可，不涉及正式環境資料、無需資料回滾腳本。

## Resolved Questions

- **Firebase 方案**：目前為 Spark（免費）方案。本次設計（custom token、`setCustomUserClaims`、LIFF ID Token JWT 驗證）皆不需要 Blaze 專用功能，Spark 方案可行。既有 Phone Auth 因 Firebase 限制仍需 Blaze，屬既有限制、與本次變更無關。
- **邀請連結 token 有效期**：24 小時，超過即拒絕、需後台重新產生連結。
- **LINE LIFF SDK 版本**：採用官方 `@line/liff` 套件最新版（撰寫時為 `2.29.2`），套件自帶 `index.d.ts` 型別，不需自行補型別。
- **孤立重複帳號的後台清理介面**：不在本次變更處理（維持 Decision 10 的 Non-Goal，孤立帳號保持不動，之後視營運需求再開新變更）。
