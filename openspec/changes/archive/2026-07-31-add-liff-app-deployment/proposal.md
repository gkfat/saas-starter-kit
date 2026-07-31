## Why

`add-line-liff-identity` change 新增了 LINE LIFF 前端的登入/註冊/綁定邏輯，但該功能需要一個實際存在的 LIFF 前端 app 作為載體，並需要能部署上線、被 LINE App 開啟。

目前專案是單一 Nuxt 3 app（前端頁面與 `server/` API 混在同一個專案內），無法單純「再加一個 app」——必須先把專案拆成真正的 monorepo 結構（API server / 後台前端 / LIFF 前端三個獨立 app），並把跨 app 共用的型別、常數、工具抽成共用套件，LIFF app 才有一個乾淨的位置可以放進去。本 change 把「monorepo 重構」與「LIFF app 骨架、Firebase 多 Hosting targets、CI/CD」一併納入，作為 `add-line-liff-identity` 的部署/結構前置基礎，與身份/登入邏輯的規劃分開推進與追蹤。

## What Changes

- 將現有單一 Nuxt app 拆分為 pnpm workspace monorepo，新增以下三個 app：
  - `apps/server`：現有 `server/` 目錄（api、middleware、modules、shared、utils）整理為獨立的 Nitro API server
  - `apps/admin`：現有 Nuxt 前端（`pages/`、`components/`、`composables/`、`layouts/`、`middleware/`、`stores/`、`plugins/`、`assets/`、`i18n/`、`config/`、`utils/` 等）原封不動搬移，僅調整 import 路徑與 API base URL
  - `apps/liff`：新增的 LINE LIFF 前端 app（骨架部分，登入邏輯由 `add-line-liff-identity` 負責）
- 新增 `packages/shared`：把現有根目錄 `shared/`（`dto/`、`roles.ts`、`permissions.ts`、`timezones.ts`、`feature-flags.ts`、`feature-modules.ts`、`users.ts`、`utils/validation.ts` 等）與跨 app 共用的瀏覽器工具（如 `utils/firebase-client.ts`）搬進來，作為三個 app 都能安裝依賴的內部套件
- **BREAKING**：原本靠 Nuxt/Nitro `~/shared` alias 的隱式 import 全部改為明確 `import ... from '@saas-starter-kit/shared'`（套件名稱待 tasks 階段定案）
- **BREAKING**：`apps/admin`、`apps/liff` 呼叫 `apps/server` API 改為跨 origin（不同 Hosting target = 不同網域/路徑），API server 需新增 CORS 允許清單
- `apps/admin`、`apps/liff`（靜態 SPA）部署到同一個 Firebase 專案下的兩個 Hosting targets；`apps/server`（API）改為 Cloud Run（`min-instances = 0`，控制成本）**BREAKING**（部署平台由 Firebase Hosting 改為 Cloud Run）
- 單一 CI/CD pipeline 新增依 git diff 路徑判斷 build/deploy 範圍的邏輯，只 build/deploy 有異動的 app
- 本機開發支援 ngrok/cloudflared 對外 HTTPS 穿透，以便在 LINE App 內測試 LIFF 頁面

## Capabilities

### New Capabilities

- `liff-app-deployment`: 專案 monorepo 化（`apps/server` / `apps/admin` / `apps/liff` / `packages/shared`），共用同一 GCP/Firebase 專案；`apps/admin`/`apps/liff` 用 Firebase Hosting 多 targets、`apps/server` 用 Cloud Run 部署，CI/CD 依路徑差異拆分 build/deploy

### Modified Capabilities

- `architecture`: 「Module Directory Structure」由單一 Nuxt app 內的 `server/` 目錄，改為 monorepo 下的 `apps/server/`；新增 `packages/shared` 的角色與定位說明

## Impact

- **程式碼**：整個 repo 目錄結構重組（`pages/`、`components/`、`composables/` 等移至 `apps/admin/`；`server/` 移至 `apps/server/`；根目錄 `shared/` 移至 `packages/shared/`）；所有現有 import 路徑需要調整
- **建置工具**：新增 `pnpm-workspace.yaml`；`apps/*` 各自的 `package.json`、`tsconfig.json`；`packages/shared` 需可被三個 app 以 workspace 依賴方式安裝
- **API 呼叫**：`apps/admin`、`apps/liff` 對 `apps/server` 的呼叫從同源改為跨 origin，需新增 CORS 設定；既有 Authorization Bearer idToken 機制不受影響（非 cookie-based）
- **部署設定**：`firebase.json` 新增第二個 Hosting target（`apps/liff`）；`apps/server` 新增 Dockerfile，部署到 Cloud Run
- **依賴**：本次不新增 LINE LIFF SDK（由 `add-line-liff-identity` 負責）；可能新增 monorepo 工具鏈相關 devDependencies（視 tasks 階段實作方式而定）
- **測試**：`tests/` 需依新的 app 邊界重新歸屬（server 測試歸 `apps/server`，前端測試歸各自 app）
- **與 `add-line-liff-identity` 的關係**：本 change 提供 monorepo 結構與 LIFF app 骨架；`add-line-liff-identity` 的 LINE 登入頁面/邏輯與 `modules/identity` 需建立在本 change 產出的 `apps/server`、`apps/liff` 骨架之上。建議實作順序：先完成本 change 的 monorepo 重構與 Hosting target，`add-line-liff-identity` 再接續進行
