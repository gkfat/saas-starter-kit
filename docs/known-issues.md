# Known Issues

記錄已發現但非當前 change 範圍內修復的既有缺陷，供未來排查與立案參考。

---

## 會員註冊流程非原子性，中途失敗會留下半成品帳號

**發現時機**：`add-member-level-management` change 設計審查（評估是否要在 `registerUserWithProvider` 內新增 `level.initializeMemberPeriod` 呼叫時發現此為既有問題，非本次新增）

**現況**：

`apps/server/server/modules/users/users.service.ts:19-56` 的 `registerUserWithProvider()` 依序執行：

1. `bindProvider`（identity 模組）
2. `createUser`（Firestore users 文件）
3. `assignUserRole`（roles 模組）

三步之間**沒有任何 transaction 或補償邏輯**。若任一步在前面步驟成功後失敗（例如 `assignUserRole` 失敗），已寫入的 Firestore 資料不會被回滾，留下「使用者已存在但缺少某些初始化狀態」的半成品帳號。

三條註冊路徑（`register.post.ts`、`line-register.post.ts`、`google-register.post.ts`）的錯誤處理也彼此不一致：

- `register.post.ts` / `line-register.post.ts`：catch 內會 best-effort 呼叫 `adminAuth().deleteUser(firebaseUid)` 刪除 Firebase Auth 帳號（失敗即吞掉），但**不會**刪除已寫入的 Firestore users 文件或 identity 綁定
- `google-register.post.ts`：catch **完全沒有 rollback**，連 Firebase Auth 帳號都不會刪除

**使用者影響**：

- 前端（`apps/admin/components/auth/RegisterForm.vue`、`apps/liff/src/pages/RegisterPage.vue`）僅依 HTTP 409 顯示「帳號已被使用」，其餘一律顯示通用錯誤文字，**沒有任何機制辨別或恢復半成品帳號**
- 使用者若用同一 username 重試，會被 `findUserByUsername` 檢查擋下、回傳 409，但實際上沒有可用帳號，只能改用其他 username 或由後台人工處理
- repo 內無孤兒帳號清理機制（無 cleanup job、無 admin 工具）

**建議處理方式**：

獨立立一個 change 處理，需要先決定：

- 是否要把整個註冊流程包進單一 Firestore transaction（需要調整 `identity`/`users`/`roles` 三個模組 repo 函式的介面，讓它們可以接受外部傳入的 transaction）
- 或至少統一三條註冊路徑的 best-effort rollback 行為，並補上 Firestore 資料的清理
- 是否需要後台孤兒帳號查詢/清理工具

**與本次 change 的關係**：

`add-member-level-management` 會在 `registerUserWithProvider` 內新增第四步 `level.initializeMemberPeriod`（gated by feature flag），此步驟失敗時會觸發與現有 `assignUserRole` 失敗完全相同的既有半成品帳號問題——不是本次新增的風險類別，僅是多一個觸發點。本次不在此 change 範圍內修復。

`add-member-number` 同理會在 `createUser` 之前新增 `generateMemberNo()` 步驟，失敗（例如重試次數用盡仍碰撞）會讓整支註冊 API 回錯誤，屬於同一類已知限制的又一個觸發點，本次同樣不修復。
