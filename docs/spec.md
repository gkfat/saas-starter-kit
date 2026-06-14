# SaaS Starter Kit — 規格文件

## 主要展示

- Authentication 身份驗證
- Authorization 授權 RBAC
- Backend Architecture 架構
- Audit Logging 監控
- Firebase 生態系串接
- Admin Dashboard

---

## 技術棧

- **Framework**: Nuxt 3（穩定版，`ssr: false` SPA 模式）
- **UI**: Vuetify
- **Backend**: Nuxt Server API
- **Auth**: Firebase Auth
- **Database**: Firestore
- **Firebase Server SDK**: Firebase Admin SDK（Node.js，service account 認證）
- **Firebase Client SDK**: Firebase Client SDK（瀏覽器，Auth / Phone OTP）
- **Hosting**: Firebase App Hosting

### 執行環境規範

| 項目    | 版本 |
| ------- | ---- |
| Node.js | 22.x |
| pnpm    | 9.x  |

專案根目錄需包含：

- `.nvmrc`：`22`
- `package.json` `engines` 欄位：`{ "node": ">=22", "pnpm": ">=9" }`

---

## Server 架構

### 請求流程

```
api/ (route handler)
  → middleware/ (auth check → role/permission check → request tracing → logging)
  → service/ (業務邏輯)
  → repo/ (Firestore 存取)
```

### Middleware 職責

| Middleware | 說明                                               |
| ---------- | -------------------------------------------------- |
| auth       | 驗證 Firebase ID Token，注入 user context          |
| rbac       | 依 role + permission 判斷授權                      |
| tracing    | 產生 `requestId`，注入 request context             |
| logging    | 記錄 API log（console.log GCP 格式，含 requestId） |

### Request Context

每個請求攜帶以下 context，貫穿 middleware → service：

```ts
type RequestContext = {
  requestId: string; // UUID，tracing 用
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
};
```

### 模組結構

```
server/
├── modules/
│   ├── auth/
│   │   ├── index.ts
│   │   ├── auth.service.ts
│   │   ├── auth.schema.ts    # Zod，含 DTO 定義
│   │   └── auth.types.ts
│   ├── users/
│   │   ├── index.ts
│   │   ├── users.service.ts
│   │   ├── users.repo.ts     # Firestore repo layer
│   │   ├── users.schema.ts
│   │   └── users.types.ts
│   ├── roles/
│   │   ├── index.ts
│   │   ├── roles.service.ts
│   │   ├── roles.repo.ts
│   │   ├── roles.schema.ts
│   │   └── roles.types.ts
│   └── logs/
│       ├── index.ts
│       ├── logs.service.ts
│       ├── logs.repo.ts
│       ├── logs.schema.ts
│       └── logs.types.ts
├── api/                      # Route handlers（薄層）
│   ├── auth/
│   ├── users/
│   ├── admin/
│   ├── roles/
│   └── logs/
└── shared/
    ├── firebase-admin.ts     # Admin SDK，Lazy init guard（防 dev server hot reload 重複初始化）
    ├── firebase-client.ts    # Client SDK，僅在瀏覽器執行
    ├── middleware/
    └── utils/
```

### 模組邊界規則

| 規則                          | 說明                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| 模組不跨模組引用 service      | 只能引用對方 `index.ts` 公開介面                                                         |
| `api/` 為薄層                 | handler 只做 parse → call service → return                                               |
| `shared/` 不依賴任何 module   | 純工具與基礎設施，無業務邏輯                                                             |
| 跨模組傳遞資料                | 優先傳 primitive（如 `userId: string`）                                                  |
| `logs` 可引用 `users` types   | `audit_logs` / `login_logs` 與 user 綁定                                                 |
| Firebase SDK 分離放 `shared/` | `firebase-admin.ts`（server）/ `firebase-client.ts`（browser），各模組從 shared 取得實例 |

### DTO 規範

- 每個 API endpoint 須定義對應的 Request DTO 與 Response DTO
- 以 Zod schema 作為 runtime 驗證，並 infer 出 TypeScript type
- DTO 定義於各模組的 `*.schema.ts`

```ts
// 範例
export const CreateUserDto = z.object({ ... })
export type CreateUserDto = z.infer<typeof CreateUserDto>
```

### Repo Layer

- 每個模組的 Firestore 操作封裝於 `*.repo.ts`
- Service 不直接呼叫 Firestore SDK，一律透過 repo
- Repo 只處理 CRUD，不含業務邏輯

---

## Firestore 結構

### Multi-tenant 設計

所有資料以 `tenantId` 作為頂層隔離：

```
tenants/{tenantId}/
  ├── users/{userId}
  ├── roles/{roleId}
  ├── permissions/{permissionId}
  ├── role_permissions/{rolePermissionId}
  ├── user_roles/{userRoleId}
  ├── audit_logs/{logId}
  └── login_logs/{logId}
```

### Collections Schema

```
users           { uid, email, displayName, tenantId, createdAt }
roles           { id, name, tenantId, createdAt }
permissions     { id, name, description, tenantId }
role_permissions { roleId, permissionId, tenantId }
user_roles      { userId, roleId, tenantId }
audit_logs      { ...base_log, type: 'audit', ... }
login_logs      { ...base_log, type: 'login', ... }
```

---

## RBAC

### Hybrid RBAC + Permission 模型

- **Role-level**：決定使用者身份（`superadmin` / `admin` / `member`）
- **Permission-level**：細粒度操作控制（如 `users:read`、`users:write`）
- 判斷順序：先驗 role → 再驗 permission

### 預設 Role

| Role         | 說明                                |
| ------------ | ----------------------------------- |
| `superadmin` | Firebase Auth custom claims，全權限 |
| `admin`      | 後台管理，依 permissions 設定       |
| `member`     | 一般會員，最小權限                  |

- Phase 2：開放後台動態新增 role / permission，架構設計須支援無痛 migrate

---

## Features

### Authentication

| 方式                 | 說明                                        |
| -------------------- | ------------------------------------------- |
| Email / Password     | Firebase Auth 標準登入                      |
| Google Login         | Firebase Auth Google Provider               |
| Phone Auth (SMS OTP) | Firebase Phone Auth，用於註冊時驗證手機號碼 |

**Superadmin**：預先在 Firebase Auth 建立固定帳號，設定 custom claims `{ role: 'superadmin' }`，帳密由 env 管理。

### Admin 後台

- 會員管理
- 角色管理
- 登入紀錄（`login_logs`）
- Audit Log（`audit_logs`）

---

## Logging

### Unified Log Schema

所有 log 繼承 `base_log`：

```ts
type BaseLog = {
  type: 'audit' | 'login' | 'api';
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  timestamp: string; // ISO 8601
  requestId: string; // tracing
  actor: {
    userId: string;
    tenantId: string;
    role: string;
  };
  metadata: Record<string, unknown>;
};
```

### Log 儲存策略

| 類型         | 儲存方式      | 說明                                                        |
| ------------ | ------------- | ----------------------------------------------------------- |
| `audit_logs` | Firestore     | 資料變更記錄（base_log + diff）                             |
| `login_logs` | Firestore     | 登入事件（base_log + ip, provider, result）                 |
| API Log      | `console.log` | GCP Structured Logging 格式，含 `requestId`，不存 Firestore |

---

## 技術選型決策紀錄

| 項目            | 決策                          | 原因                                                                |
| --------------- | ----------------------------- | ------------------------------------------------------------------- |
| Nuxt 版本       | Nuxt 3                        | 生態穩定，第三方套件相容性佳                                        |
| UI 框架         | Vuetify                       | 展示重點之一                                                        |
| Superadmin      | Firebase Auth + custom claims | 避免自建 session 管理複雜度                                         |
| Log 成本        | 不考量                        | 展示用途，非生產環境                                                |
| Dockerfile      | 暫不撰寫                      | Cloud Run 遷移為未來規劃                                            |
| RBAC 模型       | Hybrid RBAC + Permission      | Role 決定身份，Permission 控制細粒度操作                            |
| Repo Layer      | 抽象 Firestore 操作           | Service 與 DB 解耦，利於測試與替換                                  |
| Nuxt 模式       | SPA（`ssr: false`）           | 無 SSR hydration 問題，Firebase Client SDK 純瀏覽器執行             |
| Firebase Server | Admin SDK                     | Node.js 原生支援，verifyIdToken / custom claims 皆由 Admin SDK 提供 |
| Firebase Client | Client SDK                    | 瀏覽器端 Auth、Phone OTP                                            |
| Firebase Init   | Lazy init guard               | 防止 dev server hot reload 重複初始化 Admin SDK                     |
| Multi-tenant    | tenantId 頂層隔離             | 支援未來多租戶擴展                                                  |

---

## 部署

- 目前目標：Firebase App Hosting
- 未來規劃：Cloud Run（待評估）
