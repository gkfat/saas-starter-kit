## Context

Firebase Auth 同時具備 Client SDK（sign-in UI、OTP）與 Admin SDK（token 驗證）兩面向，需嚴格分離 browser 與 server 執行環境。

## Goals / Non-Goals

**Goals:**

- Email/Password 登入
- Google OAuth 登入
- Phone OTP（Profile 頁綁定手機，不作為主要登入入口）
- idToken → server session 換發流程
- Client route guard（未驗證 → /login）
- 登入事件寫入 `login_logs`

**Non-Goals:**

- Email 驗證（send verification email）
- 忘記密碼流程
- 第三方 OAuth 除 Google 外

## Decisions

### 1. Phone OTP 作為手機綁定，非登入方式

OTP 登入在 Firebase 需 Blaze plan，且展示專案以 Email/Google 為主要認證入口。
Phone OTP 改為 profile 頁面「綁定手機號碼」功能，降低複雜度。

### 2. idToken 換 server context 流程

```
Browser sign-in → idToken → POST /api/auth/login
Server → verifyIdToken() → 注入 userId, tenantId, role, permissions → 200 OK
```

不使用 Firebase Session Cookie，直接依賴每次 request 帶 Bearer token。

### 3. auth.global.ts route guard 邏輯

```
Unauthenticated → redirect /login
Authenticated + visiting /login or /otp → redirect /
```

使用 `useAuth()` composable 的 `currentUser` reactive state 判斷。

### 4. login_log 寫入時機

`auth.service.ts` 驗證 idToken 成功/失敗後，直接寫入 Firestore `login_logs`。
（Phase 5 logging module 完成後改走 `logsService`）

## Risks / Trade-offs

- [Phone OTP] Firebase 需 Blaze plan，dev 環境測試需注意帳單
- [idToken 無 server session cookie] 每次 request 需帶 token，前端需妥善保存 currentUser state

## Migration Plan

N/A — 新功能實作。
