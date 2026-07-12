## Why

建立 SaaS Starter Kit 的基礎建設，提供後續所有 feature 的骨架：Nuxt 3 SPA 模式、Firebase 整合、Server middleware chain、多租戶 Firestore 路徑設計。

## What Changes

- 初始化 Nuxt 3 專案（SPA mode, ssr: false）
- 整合 Vuetify UI 框架
- 整合 Firebase Admin SDK（server）與 Firebase Client SDK（browser）
- 建立 server middleware chain（tracing → logging → auth）
- 定義 `RequestContext` / `AuthenticatedContext` 型別
- 建立多租戶 Firestore 路徑規範（`tenants/{tenantId}/`）
- 設定 ESLint、Prettier、Husky pre-commit hook

## Capabilities

### New Capabilities

- `project-infra`: 完整 Nuxt 3 SPA 骨架，包含 Firebase 雙 SDK 整合與 server middleware chain

## Impact

- **新增**: `nuxt.config.ts`、`app.vue`、`layouts/default.vue`
- **新增**: `server/shared/firebase-admin.ts`（Admin SDK lazy init）
- **新增**: `utils/firebase-client.ts`（Client SDK browser-only）
- **新增**: `server/middleware/01.tracing.ts`、`02.logging.ts`、`03.auth.ts`
- **新增**: `server/shared/types/context.ts`（RequestContext 型別）
- **新增**: ESLint / Prettier / Husky 設定
- **依賴**: nuxt, vuetify, firebase, firebase-admin, zod
