## Context

登入流程（`processLogin`）在 `POST /api/auth/login` 完成後會自動呼叫 `saveUser`（Firestore upsert），因此「建立 Firebase Auth 帳號 → 取得 idToken → POST `/api/auth/login`」這條路徑天然涵蓋了使用者資料落地，不需要額外的 register API endpoint。

`createUserWithEmailAndPassword` 建立帳號後，Firebase 不會自動設定 displayName；需要在建立後立即呼叫 `updateProfile(user, { displayName })` 寫入名稱，否則 `saveUser` upsert 時 displayName 會是 null。

## Goals / Non-Goals

**Goals:**

- 以 `createUserWithEmailAndPassword` + `updateProfile` 完成帳號建立
- 註冊成功後自動取得 idToken，呼叫現有 `store.setSession` 完成登入
- 提供 `pages/auth/register.vue`（displayName、email、password、confirm password）
- Login page 補上「前往註冊」連結

**Non-Goals:**

- Email 驗證（Firebase email verification）
- 密碼強度規則 UI（Firebase 預設強度已足夠）
- Google 帳號的自助註冊（Google 登入本身已涵蓋）
- Server-side register endpoint

## Decisions

**Decision 1：沿用 `POST /api/auth/login` 完成 session 建立，不新增 register endpoint**

Firebase `createUserWithEmailAndPassword` 在 client 端建立帳號後，直接取得 idToken 呼叫 `POST /api/auth/login`，`processLogin` 內的 `saveUser` 會自動 upsert Firestore 使用者文件。新增獨立 register endpoint 只會製造重複邏輯。

**Decision 2：`register()` 方法封裝在 `useAuth.ts`，不拆獨立 composable**

注冊邏輯（create → updateProfile → getIdToken → setSession）與登入邏輯共用同一個 Firebase auth instance 與 store，放在同一 composable 內維持一致性。

**Decision 3：confirm password 驗證在 UI 層，不下沉至 composable**

`register(displayName, email, password)` 只接收驗證後的值；兩次密碼比對是純 UI 邏輯，由 register page 自行處理，composable 不負責。

## Risks / Trade-offs

- **Email 已被其他 provider 使用** → Firebase 若同一 email 已有 Google 帳號，`createUserWithEmailAndPassword` 會拋出 `auth/email-already-in-use`；register page 需顯示明確錯誤訊息，引導使用者改用 Google 登入。
- **displayName 時序** → 必須先 `updateProfile` 再 `getIdToken`（force refresh），確保 idToken 的 `name` claim 含有 displayName；否則 `saveUser` 會以 null 覆蓋。
