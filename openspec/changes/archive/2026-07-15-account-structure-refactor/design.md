## Context

目前帳號系統以 Firebase Auth email/password 為主要登入方式，email 為必填。Firebase Auth 使用 email 作為唯一識別，直接以 email 查找帳號。

新需求要求引入 username 作為主要帳號識別符，email 與手機為選填綁定。這與 Firebase Auth 的帳號模型有根本性差異（Firebase Auth 以 email 或 phone 為 identifier），需要設計橋接層。

## Goals / Non-Goals

**Goals:**

- 以 username（6–8 英數字）作為登入識別符
- password 格式：6–8 英數字
- email、手機號碼均為選填，可後期綁定
- Google Provider 作為附加登入方式，需與已綁定 email 一致
- Google 繼續但帳號不存在 → 快速註冊流程
- 更新 seed-demo-users 使用新結構

**Non-Goals:**

- 不移除 Firebase Auth 作為底層 auth engine
- 不支援 username 重新命名
- 不實作 email/phone OTP 驗證流程（僅儲存，不驗證）
- 不實作帳號合併（兩個既有帳號合一）

## Decisions

### Decision 1: Firebase Auth 繼續作為 auth engine，username 橋接透過 Firestore 查詢

**問題**：Firebase Auth 不支援 username 作為 identifier；登入時需要 email 或 phone。

**選項 A**：完全自建 auth（JWT、bcrypt）→ 放棄 Firebase Auth

- 優：完全控制
- 缺：工程量大，失去 Firebase 生態（Google SSO、Phone OTP）

**選項 B**：Firebase Auth 繼續負責認證，Firestore users 儲存 username，登入時先 lookup username → 取得對應的 Firebase custom email（合成 email）

- 合成 email 格式：`{username}@internal.local`（不對外暴露）
- 登入流程：username → 查 Firestore → 取合成 email → Firebase `signInWithEmailAndPassword(syntheticEmail, password)`
- 優：保留 Firebase Auth 生態，實作簡單
- 缺：合成 email 是 internal artifact，需妥善隱藏

**選擇：選項 B**
理由：最小改動，保留 Firebase Auth SDK 投資，符合 demo 專案原則。

### Decision 2: Google 登入判斷方式（以 uid 查找，非 email 比對）

綁定改為僅透過 Profile 頁面主動觸發（`linkWithPopup`，見 account-provider-binding spec），因此 Google credential 一旦綁定即與該帳號的 Firebase Auth uid 永久連結。登入頁「以 Google 繼續」流程改為：

- Google 登入後取得的 Firebase Auth idToken 解出 uid，server 以此 uid 查詢 Firestore `users` doc（doc ID = uid）
- 若該 doc 存在且 `providers` 含 `'google'` → 直接登入（`/api/auth/login` OAuth 流程）
- 若查無此 doc，或 doc 存在但 `providers` 不含 `'google'` → 進入快速註冊流程（帶入 Google 資訊預填 username）
- 不再比對 email；email 是否一致與登入判斷無關（見 account-provider-binding spec 的 Profile 綁定 Requirement）

### Decision 3: Username 唯一性保證

在 Firestore `users` 建立時，server 端執行 `username` 唯一性查詢（repo layer）。由於 Firestore 無原生 unique constraint，需在 service 層做查詢後 write，並接受極低機率的 race condition（demo 專案可接受）。

### Decision 4: 合成 email 的密碼與 Firebase Auth 帳號管理

- 註冊時：`createUserWithEmailAndPassword(syntheticEmail, password)` 建立 Firebase Auth 帳號
- 登入時：查詢 Firestore username → syntheticEmail → `signInWithEmailAndPassword`
- syntheticEmail 不顯示在任何 UI
- Firebase Auth UID 仍作為 Firestore `users/{userId}` 的 doc ID

## Risks / Trade-offs

- [Risk] Firestore username lookup 在每次登入多一次 round trip → Mitigation: demo 專案流量極低，可接受；未來可加 cache
- [Risk] 合成 email 若外洩，使用者可能困惑 → Mitigation: 確保 API response 不回傳 syntheticEmail 欄位
- [Risk] Username uniqueness race condition → Mitigation: demo 專案接受；production 可改用 Firestore transaction 或 username 作為 doc ID
- [Risk] Google 快速註冊時 username 需使用者自行選擇（Google profile 無 username） → Mitigation: 預填 Google displayName 清除特殊字元後作為建議值，使用者可修改

## Migration Plan

1. 新增 `users` collection 欄位：`username`（string, required）、`email`（string, optional）、`phone`（string, optional）、`providers`（string[], default `['password']`）
2. 更新 seed-demo-users 產生符合新結構的 demo 帳號
3. 現有 demo 資料重新 seed（dev 環境）
4. 無需 rollback plan（demo 專案，無 production 資料）

## Open Questions

- 無
