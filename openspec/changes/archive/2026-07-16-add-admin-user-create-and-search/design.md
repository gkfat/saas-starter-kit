## Context

現行 `/auth/register`（帳號密碼自助註冊）與 Google 快速註冊（`account-provider-binding`）並存。管理端 `/admin/users` 已能列出使用者並調整角色（`PATCH /api/admin/users/:id`），但無建立使用者、無伺服器端查詢、無匯出。RBAC 已具備 `resource:action` 權限模型與 `role_permissions` Firestore collection，新增權限只需擴充 `shared/permissions.ts`、`shared/roles.ts` 與 seed script。

## Goals / Non-Goals

**Goals:**

- 讓具權限的管理者可直接建立使用者並指派初始角色
- 使用者列表查詢改為伺服器端（username/email/role），支援匯出目前查詢結果為 CSV
- 使用者列表顯示帳號狀態（已啟用／已停用／尚未變更預設密碼）與最近登入時間，並提供停用/啟用、重新產生設定密碼連結操作

**Non-Goals:**

- 不變更既有帳號密碼自助註冊流程（`/auth/register`、`POST /api/auth/register`、登入頁註冊連結維持現狀）
- 不刪除既有帳號密碼登入能力（`account-username-auth` 的登入需求維持不變）
- 不變更 Google 快速註冊流程（`account-provider-binding`）
- 不引入分頁或後端排序（維持現有一次性載入全部使用者的行為，僅新增查詢條件）
- 不引入新的 CSV 產生第三方套件（前端以純字串組裝 CSV 並用 Blob 下載，與現有依賴堆疊一致）

## Decisions

### 1. Admin 建立使用者重用 `users.service.registerUser`

`POST /api/admin/users` 呼叫既有 `registerUser(tenantId, data)`（含 username 唯一性檢查、Firestore 文件建立、角色指派），差異僅在於：

- 呼叫者需具備 `users:create` 權限（而非走 Firebase Client SDK 自助流程）
- 由後端使用 Firebase Admin SDK 建立對應的 Firebase Auth 帳號（`admin.auth().createUser`），而非前端 `createUserWithEmailAndPassword`
- 初始密碼：由後端產生亂數密碼（不回傳給前端、僅作為佔位雜湊值）。管理端建立的帳號預設 `providers: []`；使用者透過本次新增的「一次性密碼設定連結」（見 Decision 3）自行設定密碼並登入，或另行綁定 Google（`/auth/register` 自助註冊入口維持開放，不受本次變更影響）

**Alternative considered**：讓管理者輸入初始密碼。與「僅允許 Google 註冊」的整體方向矛盾，且需額外處理密碼強度驗證與傳輸安全，故不採用。

**補充**：`displayName` 為選填，省略時預設為 `username`；`role` 為選填，省略時預設為 `member`（與 `registerUser` 既有的自助註冊預設角色一致）。

### 2. 查詢改為伺服器端，匯出留在前端

`GET /api/admin/users` 擴充 query params（`q`、`role`），在 `users.repo.listUsers` 增加條件式 Firestore 查詢（Firestore 不支援多欄位 OR + 部分字串比對，故 username/email 的 `q` 篩選在 service 層對 `listUsers` 結果做記憶體過濾，role 篩選則可用 Firestore `where` 或同樣在記憶體中過濾——依現有使用者規模，統一在記憶體過濾以維持程式碼簡單）。匯出以「目前畫面上顯示的資料」為準，前端組裝 CSV 字串並用 `Blob` + `URL.createObjectURL` 觸發下載，不新增後端匯出端點。

**Alternative considered**：後端專屬匯出端點（`GET /api/admin/users/export`）。因資料量小、無需串流或分頁，前端直接轉出可避免重複實作查詢邏輯，故不採用。

### 3. 一次性密碼設定連結

建立使用者時，後端產生高熵亂數 token（32 bytes hex），寫入 Firestore
`password_setup_tokens/{token}` 文件（欄位：`uid`、`expiresAt`、`used`、`createdAt`），
效期 24 小時。連結格式：`{origin}/auth/set-password?token={token}`，`origin` 取自請求的
`getRequestURL(event).origin`。

新增模組 `server/modules/password-setup`（遵循既有 module 結構：
types/repo/service/index），提供 `generateSetupToken(uid)` 與
`consumeSetupToken(token)`。`consumeSetupToken` 驗證 token 存在、未過期、未使用，
驗證成功後立即標記為已使用（一次性）。

`pages/auth/set-password.vue` 為公開路由（免登入，需加入
`middleware/auth.global.ts` 的 `PUBLIC_ROUTES`），讀取 query 參數 `token`，
使用者輸入新密碼後呼叫 `POST /api/auth/set-password`。後端消費 token 取得
`uid`，雜湊密碼寫回 `users.passwordHash`，於 `providers` 補上 `'password'`
（沿用既有 `users.repo` 更新模式，新增 `setUserPassword` 函式），成功後前端
導向 `/login`。

因系統目前無 email/通知模組（Phase 6 待辦），連結不透過信件寄送，改為
`POST /api/admin/users` 回應中夾帶 `setupLink`，前端於建立使用者成功的對話框
中顯示並提供複製，由管理者自行轉交。

**Alternative considered**：串接寄信服務直接發送連結。因通知機制屬於 Phase 6
範疇、且本次變更 Non-Goals 已排除引入新的外部服務依賴，故不採用。

### 4. 帳號狀態：停用/啟用 + 尚未變更預設密碼

**啟用/停用**：直接讀寫 Firebase Auth `UserRecord.disabled` 欄位（`adminAuth().updateUser(uid, { disabled })`），不在 Firestore 額外複製此狀態，避免雙來源不一致。`GET /api/admin/users` 既有的逐使用者 `adminAuth().getUser()` 查詢（原僅用於 `isSuperAdminUid`）合併為單一函式 `getAuthAccountStatus(uid): { isSuperAdmin, disabled }`，避免對同一 uid 呼叫兩次 Admin SDK。

新增 `PATCH /api/admin/users/:id` 支援 body 帶 `disabled: boolean`（與既有 `role` 欄位皆為可選，至少需提供一項）。停用時一併呼叫既有 `revokeRefreshTokens(uid)` 讓已登入的 session 立即失效；為避免管理者鎖死自己的帳號，若 `actorId === userId` 且 `disabled === true` 則拒絕請求。此操作寫入 `audit_logs`（action: `user.status.update`）。

**尚未變更預設密碼**：於 Firestore `users` 文件新增欄位 `passwordSetupPending: boolean`。`createUserByAdmin` 建立時寫入 `true`；一般自助註冊（`registerUser` 未指定此欄位）預設為 `false`（自助註冊者本來就自行設定密碼）。使用者透過一次性連結呼叫 `POST /api/auth/set-password` 成功設定密碼後（`setUserPassword`），將此欄位改回 `false`。

列表狀態顯示優先順序（互斥）：`disabled === true` → 「已停用」；否則 `passwordSetupPending === true` → 「尚未變更預設密碼」；否則 → 「已啟用」。停用狀態優先於「尚未變更預設密碼」，因為帳號一旦停用即無法登入，密碼是否設定已不重要。

**重新產生設定密碼連結**：僅 `passwordSetupPending === true` 的使用者才會在操作欄看到此按鈕。新增 `POST /api/admin/users/:id/setup-link`，需 `users:write` 權限（與既有「編輯角色」操作共用同一權限，行為與現有操作欄一致，不新增權限），後端先驗證該使用者 `passwordSetupPending === true`（防止繞過前端直接呼叫 API 對已設定密碼的帳號重新產生連結），再呼叫既有 `generateSetupToken(uid)` 組出連結並回傳；前端於 dialog 顯示並提供複製（沿用建立使用者流程已實作的連結顯示/複製 dialog）。此操作寫入 `audit_logs`（action: `user.setup_link.regenerate`）。

**Alternative considered**：把 `disabled` 也複製一份到 Firestore `users` 文件，方便查詢/篩選。因 Firebase Auth 才是啟用/停用的權威來源，複製一份會有雙寫不一致風險，且目前使用者規模小、逐筆呼叫 Admin SDK 成本可接受，故不採用。

### 5. 最近登入時間

Firestore `users` 文件新增欄位 `lastLoginAt: string | null`（建立時為 `null`）。密碼登入（`login.post.ts` 的 password 分支）與 OAuth 登入（`processLogin`）皆會更新此欄位：擴充既有 `syncUserOnLogin`（`users.repo.ts`）於每次呼叫時無條件寫入 `lastLoginAt = new Date().toISOString()`（原本僅在 `displayName`/`phone` 有值時才更新文件），並在密碼登入流程中補上呼叫 `touchUserOnLogin`（目前僅 OAuth 流程有呼叫）。

**Alternative considered**：另建 `login_logs` 查詢取最後一筆作為最近登入時間。`login_logs` 由 `FeatureFlag.LoginLog` 控制、可能未啟用，且需額外查詢排序，不若直接在 `users` 文件維護單一欄位簡單可靠，故不採用。

### 6. 刪除使用者（獨立權限、限已停用帳號）

新增 RBAC 權限 `users:delete`，與 `users:write`/`users:create` 獨立，預設授予 `admin` 角色。刪除操作為不可逆的破壞性動作，因此限制為「僅能刪除已停用（`disabled === true`）的使用者」——與停用/啟用的既有審核流程銜接（先停用觀察，確認無誤後才能刪除），並降低誤刪仍在使用中帳號的風險。

前端操作欄僅在 `item.disabled === true` 且具備 `users:delete` 權限時顯示刪除按鈕，點擊後需經確認 dialog。後端新增 `DELETE /api/admin/users/:id`，`requirePermission(event, Permission.Users.Delete)`，並在伺服器端重新驗證目標使用者 `disabled === true`（防止繞過前端限制、對啟用中帳號呼叫 API），同時比照停用操作禁止 `actorId === userId`。刪除動作依序執行：`adminAuth().deleteUser(uid)`（Firebase Auth 帳號）、刪除 Firestore `users/{uid}` 文件、刪除 `user_roles/{uid}` 文件（新增 `server/modules/roles` 的 `deleteUserRole(uid)`，避免留下指向已刪除使用者的孤兒角色資料），寫入 `audit_logs`（action: `user.delete`）。

`password_setup_tokens` 中殘留的舊 token（若存在）不特別清除，因其僅記錄 `uid` 且已無對應使用者可用該 token 設定密碼，不構成安全或資料完整性問題。

**Alternative considered**：允許刪除任何狀態的使用者（不限已停用）。刪除為不可逆操作，若使用者仍是啟用狀態代表其可能仍在使用中，直接允許刪除風險過高；要求「先停用才能刪除」提供一道緩衝與確認機制，故採用限制版本。

## Risks / Trade-offs

- [管理者若未妥善轉交一次性連結，或忘記轉交，使用者仍無法登入] → 已於本次新增「重新產生連結」功能緩解（見 Decision 4），管理者可隨時為未設定密碼的使用者重新取得連結
- [記憶體過濾在使用者數量增長後效能下降] → 現有 `listUsers` 已是一次讀取全部使用者，本次未改變此假設；若未來使用者規模擴大需改為 Firestore 索引查詢或分頁，另開變更處理
- [`users:create` 權限遺漏 seed，導致既有 admin 帳號建立後看不到按鈕] → `scripts/seed-rbac.ts` 需同步更新 `admin` 角色權限清單，並於 tasks 中列為必要步驟
- [`password_setup_tokens` 中過期 token 未清除，長期累積佔用 Firestore 空間] → 資料量小、效期短，暫不處理；未來可視需要加上排程清理，不在本次範圍
- [列表逐使用者呼叫 `adminAuth().getUser()` 取得 `disabled` 狀態，使用者數量增加時延遲上升] → 與既有 `isSuperAdminUid` 逐筆查詢的既有假設一致，本次僅合併為單次呼叫、未新增額外呼叫次數；效能優化留待使用者規模擴大後另開變更處理
- [刪除使用者為不可逆操作，誤刪無法復原] → 限制僅能刪除已停用帳號並要求前端二次確認，作為緩衝機制；不提供復原功能（不在本次範圍）
- [`users:delete` 權限遺漏 seed，導致既有 admin 帳號看不到刪除按鈕] → 與 `users:create` 相同，`scripts/seed-rbac.ts` 已依 `PermissionMeta`/`RolePermissions` 動態產生，新增權限後自動生效，仍需執行 `pnpm seed:rbac`

## Migration Plan

1. 更新 `shared/permissions.ts`、`shared/roles.ts` 新增 `users:create` 並加入 `admin` 預設權限
2. 更新 `scripts/seed-rbac.ts`，重新執行 `pnpm seed:rbac` 使既有租戶的 `role_permissions` 補上新權限（既有 admin 帳號需重新登入以取得新 permissions）
3. 新增後端建立使用者 API 與查詢參數擴充
4. 新增 `password-setup` 模組與 `POST /api/auth/set-password`
5. 前端新增建立使用者對話框（含設定密碼連結顯示）、查詢欄位、匯出按鈕、`set-password.vue` 頁面
6. 新增 Firestore `passwordSetupPending`/`lastLoginAt` 欄位邏輯、`getAuthAccountStatus`、擴充 `PATCH /api/admin/users/:id`、新增 `POST /api/admin/users/:id/setup-link`
7. 前端新增帳號狀態／最近登入時間欄位、停用啟用按鈕與確認 dialog、重新產生連結按鈕
8. 新增 `users:delete` 權限、`DELETE /api/admin/users/:id`、`server/modules/roles` 的 `deleteUserRole`、前端刪除按鈕與確認 dialog
9. 手動驗證：admin 登入 → 建立使用者 → 取得連結 → 以該連結設定密碼並登入 → 查詢/匯出 → 停用/啟用使用者 → 重新產生連結 → 停用後刪除使用者 → 確認既有 `/auth/register` 自助註冊流程未受影響

無需資料庫層級遷移；既有使用者文件缺少 `passwordSetupPending`/`lastLoginAt` 欄位時，讀取端一律視為 `false`/`null`（既有帳號預設視為「已啟用」且無最近登入紀錄，符合其本來就是自助註冊、已自行設定密碼的事實）。本次變更不移除任何對外路由或頁面，回滾即為還原對應檔案。

## Open Questions

- （已解決）管理端建立的使用者是否需要立即發送「設定登入方式」通知信？本次改以顯示一次性連結由管理者手動轉交取代，實際寄信整合留待 Phase 6 通知機制決定。
