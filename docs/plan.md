# SaaS Starter Kit — 實作計畫

## Phase 1：專案基礎建設

**Goal**: 建立可運行的骨架，所有後續 phase 的基礎

**Steps**:

1. 建立 `.nvmrc`（`22`）與 `package.json` engines（Node 22 / pnpm 9）
2. 初始化 Nuxt 3 + Vuetify，設定 `ssr: false`（SPA 模式）
3. 建立 `shared/firebase-admin.ts`（Admin SDK，Lazy init guard 防 hot reload 重複初始化）
4. 建立 `shared/firebase-client.ts`（Client SDK，限瀏覽器執行）
5. 建立 `shared/` 目錄結構（middleware、utils）
6. 建立 Request Context 型別 `RequestContext`
7. 實作 tracing middleware（產生 `requestId`，注入 context）
8. 實作 API log middleware（`console.log` GCP Structured Logging 格式，含 `requestId`）
9. 建立 `.env` 範本（Firebase config、service account、Superadmin 帳密）

**Risks**:

- Admin SDK 需 service account JSON，dev 環境透過 env 注入，不得 commit

---

## Phase 2：Authentication

**Goal**: 完整登入流程，含三種方式與 Superadmin

**Dependencies**: Phase 1

**Steps**:

1. 建立 `modules/auth/`（service、schema、types、index）
2. 實作 Email / Password 登入（Firebase Auth）
3. 實作 Google Login（Firebase Auth Google Provider）
4. 實作 Phone Auth SMS OTP（Firebase Phone Auth）
5. 實作 auth middleware（驗證 Firebase ID Token，注入 `RequestContext`）
6. Superadmin 設定：Firebase Auth 建立固定帳號 + custom claims `{ role: 'superadmin' }`
7. 實作 `login_logs` 寫入（base_log + provider、ip、result）
8. 建立登入 / 登出 / OTP 驗證頁面（前端）

**Risks**:

- Phone Auth 需要 Firebase Blaze 計費方案
- Client SDK（登入、OTP）只能在瀏覽器呼叫，composable 需加 `import.meta.client` guard

---

## Phase 3：RBAC

**Goal**: Hybrid RBAC + Permission 授權體系

**Dependencies**: Phase 2

**Steps**:

1. 建立 `modules/roles/`（service、repo、schema、types、index）
2. 定義 Firestore collections：`roles`、`permissions`、`role_permissions`、`user_roles`（含 `tenantId`）
3. Seed 預設資料：`superadmin` / `admin` / `member` roles + 基本 permissions（如 `users:read`、`users:write`、`admin:access`）
4. 實作 roles repo（CRUD）
5. 實作 rbac middleware（解析 role → 查 permissions → 注入 `RequestContext.permissions`）
6. 設計 permission guard util（`hasPermission(ctx, 'users:write')`）

**Risks**:

- Superadmin 走 custom claims 不查 Firestore，需在 middleware 特判
- Phase 2 migrate 路徑：之後開放後台動態新增 role 時，schema 需向下相容

---

## Phase 4：Users 模組

**Goal**: 會員資料管理，完整 module 展示範例

**Dependencies**: Phase 3

**Steps**:

1. 建立 `modules/users/`（service、repo、schema、types、index）
2. 實作 users repo（Firestore CRUD，路徑 `tenants/{tenantId}/users/{userId}`）
3. 定義 Request / Response DTO（Zod schema + infer）
4. 實作 users service（含 RBAC permission check）
5. 建立 `api/users/` route handlers（薄層）
6. audit_logs 寫入：於 service 層記錄資料變更（base_log + diff）

**Risks**:

- DTO 需涵蓋所有 API 邊界，避免 any 洩漏

---

## Phase 5：Logging 模組

**Goal**: 統一 Log 格式，集中管理 audit / login logs

**Dependencies**: Phase 4

**Steps**:

1. 定義 `base_log` schema（type、severity、timestamp、requestId、actor、metadata）
2. 建立 `modules/logs/`（service、repo、schema、types、index）
3. logs repo 實作（`tenants/{tenantId}/audit_logs`、`tenants/{tenantId}/login_logs`）
4. 確認 Phase 2 / 4 的 log 寫入符合 `base_log` 格式
5. 確認 API log `console.log` 輸出符合 GCP Structured Logging（`severity`、`message`、`httpRequest`、`requestId`）

**Risks**:

- `logs` 引用 `users.types.ts`，需確認 import 路徑不形成循環依賴

---

## Phase 6：Admin Dashboard

**Goal**: 後台管理介面，展示 RBAC 與 Log 資料

**Dependencies**: Phase 5

**Steps**:

1. 建立 Admin layout + 路由守衛（`admin:access` permission）
2. 會員管理頁：列表、搜尋、查看詳情、編輯 role
3. 角色管理頁：列出 roles + permissions 對應關係
4. 登入紀錄頁：`login_logs` 列表（時間、帳號、provider、結果）
5. Audit Log 頁：`audit_logs` 列表（時間、操作者、動作、diff）

**Risks**:

- 前端需處理 Superadmin 與 admin 的 UI 差異（部分功能僅 superadmin 可見）

---

## 跨 Phase 規範

- 每個模組完成後需通過：DTO 覆蓋所有 API 邊界、repo 不含業務邏輯、service 不直接操作 Firestore
- `tenantId` 從 Phase 1 起即納入所有 Firestore 路徑
- 所有 log 寫入統一走 `modules/logs/` service，不在各模組自行寫入
