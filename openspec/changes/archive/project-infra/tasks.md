## 1. 專案初始化

- [x] 1.1 建立 Nuxt 3 專案，設定 `ssr: false`
- [x] 1.2 整合 Vuetify（UI framework）
- [x] 1.3 設定 ESLint、Prettier、Husky pre-commit hook

## 2. Firebase 整合

- [x] 2.1 建立 `server/shared/firebase-admin.ts`（Admin SDK lazy init singleton）
- [x] 2.2 建立 `utils/firebase-client.ts`（Client SDK browser-only）
- [x] 2.3 設定 `.env` / `.env.example`（FIREBASE*\* 與 VITE_FIREBASE*\* 分離）
- [x] 2.4 建立 `server/plugins/firebase-health.ts`（dev 啟動時驗證 Admin SDK 連線）

## 3. Server Middleware Chain

- [x] 3.1 建立 `server/middleware/01.tracing.ts`（注入 requestId）
- [x] 3.2 建立 `server/middleware/02.logging.ts`（GCP Structured Logging API log）
- [x] 3.3 建立 `server/middleware/03.auth.ts`（Firebase idToken 驗證，注入 userId / tenantId）

## 4. 型別定義

- [x] 4.1 建立 `server/shared/types/context.ts`（RequestContext、AuthenticatedContext）

## 5. 多租戶規範

- [x] 5.1 確立 Firestore path prefix 為 `tenants/{tenantId}/`
- [x] 5.2 tenantId 從 Firebase Auth custom claims 取得，預設 `'default'`
