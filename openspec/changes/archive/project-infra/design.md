## Context

新專案從零開始，需要確立能支撐 Auth / RBAC / Logging / Admin Dashboard 的基礎骨架。
核心決策點：SSR vs SPA、Firebase Admin SDK 初始化策略、Server middleware 職責切分。

## Goals / Non-Goals

**Goals:**

- Nuxt 3 SPA 模式（ssr: false）
- Firebase Admin SDK server-side，Client SDK browser-only
- server middleware chain 建立 RequestContext（requestId、userId、tenantId、role、permissions）
- 多租戶 Firestore path prefix（`tenants/{tenantId}/`）
- 統一 ESLint / Prettier / Husky 規範

**Non-Goals:**

- 任何 business logic（auth、RBAC、users 等）
- CI/CD pipeline
- Docker / Cloud Run 設定

## Decisions

### 1. SPA mode（ssr: false）

Firebase Client SDK（sign-in、OTP）必須在 browser 執行，SSR 模式會造成 hydration 問題。
SPA 模式繞過此問題，且展示用途不需 SSR。

### 2. Firebase Admin SDK lazy init guard

Nuxt dev server hot reload 會重複執行 module，需用 singleton pattern 避免重複初始化。
`server/utils/firebase-singleton.ts` 封裝 lazy init 邏輯。

### 3. Server middleware 職責分離

```
01.tracing.ts  → 注入 requestId（UUID）
02.logging.ts  → GCP Structured Logging 格式輸出 API log
03.auth.ts     → 驗證 Firebase idToken，注入 userId / tenantId / role / permissions
```

每層只負責單一職責，失敗時明確回傳 HTTP error。

### 4. RequestContext 型別設計

```ts
type RequestContext = {
  requestId: string;
  userId?: string;
  tenantId?: string;
  role?: string;
  permissions?: string[];
};
type AuthenticatedContext = Required<RequestContext>;
```

`AuthenticatedContext` 是 narrowed type，供需要強制驗證的路由使用。

## Risks / Trade-offs

- [SPA] 首次載入需等 JS bundle，無 SSR SEO 優勢 → 展示用途可接受
- [Firebase Admin lazy init] dev 環境 hot reload 有風險 → singleton guard 解決

## Migration Plan

N/A — 新專案初始化。
