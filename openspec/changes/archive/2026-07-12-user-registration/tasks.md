## 1. Composable — register 方法

- [x] 1.1 在 `composables/useAuth.ts` 匯入 `createUserWithEmailAndPassword`、`updateProfile`（firebase/auth）
- [x] 1.2 新增 `register(displayName, email, password)` 方法：呼叫 `createUserWithEmailAndPassword` → `updateProfile({ displayName })` → `getIdToken(true)` → `store.setSession(idToken, 'email')`
- [x] 1.3 確認方法有 `import.meta.client` guard

## 2. 註冊頁面

- [x] 2.1 建立 `pages/auth/register.vue`（套用 blank layout）
- [x] 2.2 實作表單：displayName、email、password、confirm password 欄位
- [x] 2.3 送出前驗證 password === confirmPassword，不符則顯示錯誤，不呼叫 Firebase
- [x] 2.4 呼叫 `register()` 成功後 redirect 至 `/dashboard`
- [x] 2.5 處理 Firebase 錯誤：`auth/email-already-in-use`、`auth/invalid-email`、`auth/weak-password`，顯示對應錯誤訊息
- [x] 2.6 新增「已有帳號？前往登入」連結（指向 `/auth/login`）

## 3. Login 頁面補連結

- [x] 3.1 在 `pages/auth/login.vue` 新增「前往註冊」連結（指向 `/auth/register`）

## 4. 驗證

- [x] 4.1 執行 `pnpm build`，確認 TypeScript 編譯無錯誤
- [x] 4.2 執行 `pnpm lint`，確認 ESLint 無警告
