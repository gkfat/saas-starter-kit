## Context

現有專案是單一 Nuxt 3 app（`ssr: false` SPA 模式）：前端頁面（`pages/`、`components/`、`composables/` 等）與後端 API（`server/api/`、`server/modules/`、`server/middleware/`）都在同一個 Nuxt 專案內，由 Nitro 一併建置。跨前後端共用的型別/常數（`shared/dto/`、`shared/roles.ts`、`shared/permissions.ts` 等）目前透過 `nuxt.config.ts` 的 `nitro.alias['~/shared']` 隱式解析，屬於單一專案內部的路徑別名，不是獨立套件。

`add-line-liff-identity` change 需要新增一個 LINE LIFF 前端 app。因為目前不是 monorepo，無法單純「再加一個 app 目錄」就達到三個 app 各自獨立建置/部署的效果——後端 API 與現有前端仍然綁死在同一個 Nuxt 專案裡。本 change 因此先把專案拆成 pnpm workspace monorepo，再把 LIFF app 加進去。

## Goals / Non-Goals

**Goals:**

- 專案拆分為 pnpm workspace monorepo：`apps/server`（API）、`apps/admin`（現有 SaaS 前端）、`apps/liff`（新 LIFF 前端）
- 跨 app 共用的型別/常數/工具抽成 `packages/shared`，三個 app 以 workspace 依賴方式安裝使用
- 三個 app 各自獨立建置、獨立部署到同一 Firebase 專案的三個 Hosting targets
- CI/CD pipeline 依變更路徑差異化 build/deploy
- 支援本機開發以 HTTPS 穿透工具在 LINE App 內測試 LIFF 頁面

**Non-Goals:**

- 不實作 LINE 登入、註冊、綁定等業務邏輯（見 `add-line-liff-identity`）
- 不做正式環境等級的高可用/多區域部署設計（side project 規模，優先控制成本，非本次目標）
- 不重寫既有業務邏輯本身（`modules/*/service.ts`、`repo.ts` 內容原封不動搬移，只調整目錄位置與 import 路徑）
- 不引入 Nx/Turborepo 等額外 monorepo 建置編排工具（先以 pnpm workspace 原生能力滿足需求，除非 tasks 階段發現效能問題）

## Decisions

### 1. Monorepo 佈局：`apps/*` + `packages/shared`

```
apps/
  server/   # API：現有 server/{api,middleware,modules,shared,utils} 原封不動搬入
  admin/    # 現有 SaaS 前端：pages/, components/, composables/, layouts/,
            # middleware/, stores/, plugins/, assets/, i18n/, config/, utils/
  liff/     # 新增 LINE LIFF 前端（骨架，登入邏輯見 add-line-liff-identity）
packages/
  shared/   # 現有根目錄 shared/ 全部內容 + 跨 app 共用的瀏覽器工具
            # （例如 utils/firebase-client.ts）
pnpm-workspace.yaml
```

`server/shared/`（`firebase-admin.ts`、`crypto.ts`、`rbac.ts` 等 server-only 純基礎設施）留在 `apps/server/shared/`，不進 `packages/shared`——維持既有規則「`shared/` 對任何 module 零依賴」，但範圍限於 server 內部，不代表跨 app 共用。

**Alternatives considered**：不拆 monorepo，`apps/liff` 直接開一個完全獨立的新 repository — 部署與版本管理更單純，但會讓「同一份會員系統邏輯」分散在兩個 repo，型別/常數無法共用，且與 `add-line-liff-identity` 決定的「單一 Firebase 專案、三個 Hosting targets」目標不一致，予以放棄。

### 2. `apps/server` 改用 standalone Nitro，不再是完整 Nuxt app

`server/` 目前的程式碼（`defineEventHandler`、`event.context`、`createError` 等）都是 H3 / Nitro 提供的能力，並非 Vue/Nuxt 頁面渲染相關功能。拆分後 `apps/server` 直接以 `nitropack` 作為 standalone server 執行，不再包含 Nuxt 的頁面編譯與 Vite 前端建置流程，減少不必要的建置依賴與時間。

**Alternatives considered**：`apps/server` 維持完整 Nuxt app、僅停用 pages（`pages: false` 或清空 `pages/` 目錄）— 改動幅度最小，但會讓 API server 的 build 持續攜帶完整 Nuxt/Vite 前端工具鏈，增加不必要的建置時間與 bundle 內容，與「API server 是純後端服務」的定位不符，予以放棄。

### 2a. `apps/server` 部署到 Cloud Run，以零成本/低成本為前提設計

`apps/server` 使用 Nitro 的 `node-server` preset 產出 Node.js server，包成容器部署到 Cloud Run。專案為 side project，成本控制優先：

- `min-instances = 0`（無流量時降到零，不產生費用），可接受 cold start 延遲
- 選用最小可行的 CPU/記憶體規格，並設定合理的 `max-instances` 上限，避免異常流量產生非預期帳單
- 落在 Cloud Run 每月免費額度內（免費層級涵蓋一定量的 request 數、CPU/記憶體用量），預期 side project 流量不會超出

**Alternatives considered**：Cloud Functions for Firebase（Nitro 官方 `firebase` preset 可直接產出）— 與 Firebase 平台整合度更高、設定更少，但使用者已表明優先選擇 Cloud Run；予以放棄，改採 Cloud Run。

### 2b. `packages/shared` 直接以 TypeScript source 被三個 app 引用，不設獨立 build step

`packages/shared` 不另外編譯成 `dist/`，三個 app 的建置工具（Vite / Nitro）直接處理 `packages/shared` 底下的 `.ts` 原始檔。設定最單純，且與現有單一 repo 的開發體感最接近（改 shared 程式碼後，各 app 立即反映、無需等待額外編譯步驟）。

**Trade-off**：若未來 `packages/shared` 需要被非 TypeScript/非本 monorepo 建置工具的環境引用（例如發布成公開 npm 套件），屆時需要補上 build step；目前三個 app 皆在同一 monorepo、同樣使用 Vite/Nitro 工具鏈，此限制暫不構成問題。

### 3. `packages/shared` 以 pnpm workspace 套件形式提供

`packages/shared` 建立獨立 `package.json`（`name: "@saas-starter-kit/shared"`），三個 app 在各自 `package.json` 以 `workspace:*` 依賴安裝。原本 `nitro.alias['~/shared']` 的隱式 import 全部改為明確的 `import { ... } from '@saas-starter-kit/shared'`。

`package.json` 的 `exports` **不使用**萬用字元 subpath（例如 `"./*": "./*.ts"`），改用單一 barrel `index.ts` re-export 所有內容，只暴露 `"."` 一個 export。實作時發現 Nitro 開發環境使用的 jiti（TS 動態載入器）對 wildcard subpath exports 解析不穩定（`require.resolve` 找不到對應的 `.ts` 檔案），單一 barrel export 沒有這個問題，且與現有程式碼原本零散的 deep import 習慣相比，改動後每個檔案只需一行 import。

**Trade-off**：需要手動修改所有既有引用 `~/shared` 的檔案，一次性改動範圍較大；但換來三個 app（含未來新增的 app）都能以標準套件依賴方式使用，不受限於 Nuxt/Nitro 專屬的 alias 機制。

### 4. 跨 origin API 呼叫：新增 CORS 設定

`apps/admin`、`apps/liff` 部署後與 `apps/server` 不再同源（不同 Hosting target）。`apps/server` 需新增 CORS 中介層，允許來自 `apps/admin`、`apps/liff` 部署網域的請求。既有 Authorization Bearer idToken 機制（非 cookie-based，見 `add-line-liff-identity` design.md）不受跨 origin 影響，只需處理 CORS preflight/允許清單本身。

### 5. 部署：`apps/admin`、`apps/liff` 用 Firebase Hosting 多 targets，`apps/server` 用 Cloud Run

`apps/admin`、`apps/liff` 是純靜態 SPA，部署到同一個 Firebase 專案下的兩個 Hosting targets；`apps/server` 是需要常駐處理請求的 API，部署到 Cloud Run（見 Decision 2a）。三者共用同一個 GCP/Firebase 專案，僅部署平台不同。單一 CI/CD pipeline，依 git diff 路徑判斷本次變更影響哪個 app，僅 build/deploy 該 app；若變更影響 `packages/shared`，視為影響所有依賴它的 app，全部重新 build/deploy。

## Risks / Trade-offs

- **[Risk] Monorepo 重構是一次性大範圍改動，牽動所有現有檔案的 import 路徑** → 採漸進式搬移＋每搬完一個 app 立即驗證 build/lint/test 通過，而非一次性搬完才驗證；列入 tasks 的分階段步驟
- **[Risk] `apps/server` 從 Nuxt 改為 standalone Nitro，既有測試/開發流程（`pnpm dev` 等）需要調整** → 需在 tasks 階段確認 Nitro standalone 的 dev/build 指令與現有 `pnpm dev` 行為一致或有替代方案，並更新 CLAUDE.md 的 Commands 區段
- **[Risk] CORS 設定遺漏或設錯，導致 `apps/admin`/`apps/liff` 無法呼叫 API** → 需撰寫對應整合測試涵蓋跨 origin 請求情境
- **[Risk] `packages/shared` 版本/建置順序問題（例如 app 建置時 shared 尚未 build）** → 依 pnpm workspace 慣例設定正確的建置順序（`packages/shared` 需先於三個 app build，或改用 source-only 引用不需預先編譯，視 tasks 階段技術選型而定）
- **[Risk] LIFF 需 HTTPS 且僅能在 LINE App 內完整測試** → 本機開發使用 ngrok/cloudflared 對外穿透

## Migration Plan

1. 建立 `pnpm-workspace.yaml`，定義 `apps/*`、`packages/*`
2. 建立 `packages/shared`，把根目錄 `shared/` 內容搬入，設定獨立 `package.json`
3. 建立 `apps/server`，把 `server/` 內容搬入，改為 standalone Nitro 專案，調整 `~/shared` import 為 `@saas-starter-kit/shared`；驗證 API 可獨立啟動、既有測試通過
4. 建立 `apps/admin`，把現有 Nuxt 前端相關目錄搬入，調整 API base URL 為指向獨立部署的 `apps/server`，調整 import 路徑；驗證前端功能與既有行為一致
5. 新增 CORS 設定於 `apps/server`，允許 `apps/admin` 網域
6. 新增 `apps/liff` 骨架（暫不含業務邏輯）
7. `apps/server` 撰寫 Dockerfile，部署到 Cloud Run（`min-instances = 0`）；Firebase 專案新增兩個 Hosting target（`apps/admin`、`apps/liff`）
8. CI/CD pipeline 新增路徑判斷邏輯
9. 交接給 `add-line-liff-identity` 接續在 `apps/server`、`apps/liff` 上實作 LINE 登入邏輯

**Rollback**：專案仍在開發階段，若重構過程發現重大問題，可直接回退到重構前的 commit/branch，不涉及正式環境資料。

## Resolved Questions

- **`apps/server` 部署載體**：Cloud Run（見 Decision 2a），`min-instances = 0` 控制成本
- **`packages/shared` 建置方式**：直接引用 TypeScript source，不設獨立 build step（見 Decision 2b）

## Open Questions

- `packages/shared` 的套件命名（`@saas-starter-kit/shared` 僅為暫定）
- `tests/` 目錄的重新歸屬方式：完全依 app 拆分成 `apps/*/tests/`，或保留部分跨 app 整合測試在根目錄
- `apps/admin`、`apps/liff` 的靜態站台是否仍用 Firebase Hosting（原計畫），或一併評估其他方案——目前假設維持 Firebase Hosting 不變，僅 `apps/server` 改用 Cloud Run
