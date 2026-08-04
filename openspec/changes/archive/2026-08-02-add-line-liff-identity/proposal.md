## Why

會員需要能透過 LINE App 內建的 LIFF 前端完成註冊/登入，並與現有會員系統互通（同一個人不論從 SaaS 前端、後台建立、或 LIFF 註冊，都應對應到同一個帳號）。LINE Login 不是 Firebase 原生支援的 provider，需要一套獨立於 Firebase Auth 之外、由後端自行維護的多 provider 身份對應機制（`user` / `user_auth` 拆分）。

專案目前仍在開發階段、無正式環境資料，既有帳號可直接砍除重建，因此順勢將 Google、username/password 一併改走同一套 `user_auth` 模型，取代現有 Firebase 原生 `linkWithCredential` + `providers` 陣列機制，避免系統內同時存在兩套身份綁定邏輯。

## What Changes

- 新增 `user_auth` 資料模型：記錄每個登入 provider 的憑證對應（`provider_type` + `provider_user_id` 組成 Firestore doc id 保證唯一），一個 `user` 可對應多筆 `user_auth`
- 新增 `modules/identity`，統籌 user ↔ user_auth 的對應邏輯；`modules/auth` 收斂為只負責 token 驗證，`modules/users` 收斂為只負責會員資料屬性 **BREAKING**（內部模組邊界調整，非對外 API 變更）
- 新增 LINE LIFF 登入/註冊流程：
  - 首次以 LINE 登入且無對應 `user_auth` → 自動建立新 `user` + `user_auth(provider=line)`，預設為普通會員
  - 已設密碼的既有帳號 → 需先用密碼登入證明所有權，才能在設定頁綁定 LINE
  - 後台建立但從未登入（未啟用）的帳號 → 透過帶一次性 token 的邀請連結，在 LIFF 內完成 LINE 登入即完成啟用＋綁定
- 後端新增 LIFF ID Token（JWT）驗證邏輯（簽章、`aud`/channel id、`exp`），不呼叫 LINE profile API
- **BREAKING**：`event.context.userId` 語意由「Firebase uid」改為「internal user_id」（透過 custom claims 傳遞），需同步調整 `03.auth.ts` 及所有讀取 `RequestContext.userId` 的呼叫端
- 綁定/解除綁定 provider 時，後端呼叫 `revokeRefreshTokens`，前端提示「帳號綁定成功，請前往登入」
- **BREAKING**：Google 登入不再使用 `linkWithCredential` 綁定同一 Firebase uid，改為保留 Google 登入原生獨立 uid，透過 `user_auth(provider=google)` 對應到 internal user_id；username/password 註冊改為同步寫入 `user_auth(provider=password)`，取代 `users` doc 上的 `providers` 陣列欄位
- **BREAKING**：既有開發環境帳號資料需全數清除重建（無正式環境資料，無需遷移腳本）
- 個人中心（admin）新增「變更密碼」：已有 `user_auth(provider=password)` 者需先以目前密碼重新登入取得 idToken 驗證所有權；尚無 password provider 者（如 LINE-only 帳號）可直接設定新密碼，成功後建立 `user_auth(provider=password)`
- Admin 登入頁新增「使用 LINE 登入」：admin 是一般瀏覽器頁面（非 LIFF app-embedded），改走 LINE Login Web OAuth（`/oauth2/v2.1/authorize` redirect + server 端 code exchange 換 `id_token`）；登入/quick-register 邏輯抽成共用函式與既有 LIFF LINE 流程共用，quick-register 直接沿用既有 `/api/auth/line-register`

> Monorepo 新增 LIFF 前端 app、Firebase 多 Hosting targets、CI/CD pipeline 調整已拆分至獨立 change `add-liff-app-deployment`，本 change 的前端頁面實作需建立在該 change 產出的 app 骨架之上。

## Capabilities

### New Capabilities

- `line-liff-identity`: LINE LIFF 註冊、登入、帳號綁定（含密碼驗證所有權、邀請連結啟用）、`user`/`user_auth` 資料模型、LIFF ID Token 驗證

### Modified Capabilities

- `auth`: 登入方式表新增 LINE；`event.context.userId` 語意由 Firebase uid 改為 internal user_id，需透過 custom claims 傳遞
- `architecture`: `RequestContext.userId` 定義由「Firebase Auth uid」改為「internal user_id（`modules/identity` 維護）」
- `account-provider-binding`: Google 綁定機制由 `linkWithCredential` + `providers` 陣列改為 `user_auth(provider=google)` 對應，移除原生 uid 比對邏輯
- `user-registration`: 註冊流程改為同步建立 `user_auth(provider=password)`，取代寫入 `providers: ['password']`
- `account-username-auth`: 註冊/登入的 provider 綁定改為透過 `user_auth` 解析，不再直接讀寫 `users` doc 的 `providers` 欄位；新增「個人中心變更密碼」需求
- `auth`（追加）: LINE Login 新增 admin Web OAuth 進入點，登入解析邏輯與 LIFF 共用同一 service 函式，不再限於 LIFF

## Impact

- **程式碼**：`server/middleware/03.auth.ts`（uid 解析邏輯）、`server/modules/auth/*`、`server/modules/users/*`（拆分出 `server/modules/identity/*`）、所有讀取 `event.context.userId` 的 handler/service、Google 綁定與 quick-register 相關 composables/API
- **資料**：新增 Firestore `user_auth` collection；移除 `users` doc 的 `providers` 欄位；`users` doc id 語意改為 internal user_id
- **既有機制**：Google 的原生 `linkWithCredential` + `providers` 陣列機制全面改為 `user_auth` 模型，`account-provider-binding` spec 需重寫；不再有兩套身份綁定邏輯並存
- **部署**：見獨立 change `add-liff-app-deployment`
- **依賴**：新增 LINE LIFF SDK（`@line/liff@2.29.2`，官方套件自帶型別）
- **環境變數**：新增 `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET`（server 端專用 `.env`）；`LINE_CHANNEL_SECRET` 因 admin Web OAuth code exchange 首次被實際使用（原本保留未用）
- **開發環境資料**：既有測試帳號（含 superadmin 以外的所有帳號）需清空重建；superadmin 不受影響（不存於 Firestore，見 `superadmin-seed` spec）
- **新增 server endpoints**：`PATCH /api/profile/password`、`POST /api/auth/line-callback`
- **外部設定**：LINE Developers Console 需另外為 admin 開啟並設定 callback URL（Web OAuth），此為人工步驟、非本 change 程式碼範圍
