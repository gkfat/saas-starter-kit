## 1. Auth Module（Server）

- [x] 1.1 建立 `server/modules/auth/auth.types.ts`（LoginPayload、LoginLog types）
- [x] 1.2 建立 `server/modules/auth/auth.schema.ts`（Zod schema for login request）
- [x] 1.3 建立 `server/modules/auth/auth.service.ts`：`verifyIdToken()`、login_log 寫入
- [x] 1.4 建立 `server/modules/auth/index.ts`：公開 `authService`

## 2. Auth API Endpoints

- [x] 2.1 建立 `server/api/auth/login.post.ts`：接收 idToken → 呼叫 authService → 注入 context
- [x] 2.2 建立 `server/api/auth/logout.post.ts`：清除 client state

## 3. Client Composables

- [x] 3.1 建立 `composables/useAuth.ts`：封裝 Firebase Client SDK，實作 signInWithEmail、signInWithGoogle、signOut、OTP
- [x] 3.2 建立 `composables/useAuthFetch.ts`：自動帶 idToken header 的 fetch wrapper

## 4. Client Route Guard

- [x] 4.1 建立 `middleware/auth.global.ts`：未驗證 → `/login`；已驗證訪問 `/login` → `/`

## 5. Pages

- [x] 5.1 建立 `pages/auth/login.vue`：Email/Password + Google OAuth 登入 UI
- [x] 5.2 建立 `pages/profile/index.vue`：個人資料 + Phone OTP 手機綁定

## 6. Login Log

- [x] 6.1 `auth.service.ts` 登入成功/失敗後寫入 Firestore `login_logs`
