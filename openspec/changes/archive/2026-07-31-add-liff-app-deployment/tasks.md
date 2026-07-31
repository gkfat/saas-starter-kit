## 1. Workspace 基礎建設

- [x] 1.1 建立 `pnpm-workspace.yaml`，定義 `apps/*`、`packages/*`
- [x] 1.2 建立 `apps/`、`packages/` 目錄骨架
- [x] 1.3 決定 `packages/shared` 套件名稱（`@saas-starter-kit/shared`）並建立其 `package.json`

## 2. 搬移 `packages/shared`

- [x] 2.1 把根目錄 `shared/`（`dto/`、`roles.ts`、`permissions.ts`、`timezones.ts`、`feature-flags.ts`、`feature-modules.ts`、`users.ts`、`utils/validation.ts`）搬入 `packages/shared`
- [x] 2.2 評估 `utils/firebase-client.ts`、`utils/format-date.ts` 是否為跨 app 共用——兩者皆依賴 Nuxt-only 能力（`useRuntimeConfig()`、`useTimezoneStore()` Pinia store），非框架無關程式碼，決定不搬入 `packages/shared`，維持留在前端 app 內
- [x] 2.3 確認 `packages/shared` 以 TypeScript source 形式即可被其他 app 直接 import（不設 build step）——改用單一 barrel `index.ts` re-export，而非萬用字元 subpath exports（jiti/nitro 對 wildcard exports 解析不穩定）

## 3. 搬移 `apps/server`

- [x] 3.1 把 `server/{api,middleware,modules,shared,utils,plugins}` 搬入 `apps/server/server`（`nitro.config.ts` 設 `srcDir: 'server'`，保留原本 `api/`/`middleware/`/`plugins/` 慣例與相對路徑不變）
- [x] 3.2 將 `apps/server` 改為 standalone Nitro 專案（`nitropack`，`node-server` preset），移除對 Nuxt 頁面/Vite 前端建置的依賴；`~` alias 語意由「專案根目錄」改為「`srcDir`」，修正所有 `~/server/*` import 為 `~/*`
- [x] 3.3 把原本 `~/shared` alias 的 import 改為 `import ... from '@saas-starter-kit/shared'`
- [x] 3.4 新增 CORS 中介層（`00.cors.ts`），依 `CORS_ALLOWED_ORIGINS` 環境變數允許清單放行
- [x] 3.5 搬移對應的 `tests/`（server 相關測試）到 `apps/server`；修正 `dotenv` 載入路徑指向根目錄 `.env`
- [x] 3.6 驗證 `apps/server` 可獨立啟動、既有 API 行為與測試通過（`pnpm dev`、`pnpm build`、`pnpm test` 皆驗證過；`pnpm test` 需注意 rate-limit 測試在短時間內重複執行會因限流視窗互相干擾，非重構問題）

## 4. 搬移 `apps/admin`

- [x] 4.1 把現有前端相關目錄（`pages/`、`components/`、`composables/`、`layouts/`、`middleware/`、`stores/`、`plugins/`、`assets/`、`i18n/`、`config/`、`utils/`、`app.vue`、`nuxt.config.ts`、`tsconfig.json`、`eslint.config.mjs` 等）搬入 `apps/admin`
- [x] 4.2 調整 API 呼叫的 base URL：新增 `plugins/api-base.ts` 覆寫全域 `$fetch` 的 `baseURL`（讀取 `runtimeConfig.public.apiBaseUrl`，來源環境變數 `API_BASE_URL`），一次涵蓋 `useApi()` 與 `useAuth.ts` 內直接呼叫 `$fetch` 的地方，不需逐一改呼叫端
- [x] 4.3 把 `~/shared` import 改為 `@saas-starter-kit/shared`
- [x] 4.4 （無獨立前端測試檔案，`tests/` 內容皆為 server 整合測試，已於 3.5 隨 apps/server 搬移）
- [x] 4.5 驗證 `apps/admin` 建置通過；`apps/server` 啟動後以 curl 驗證 CORS allow/deny 行為正確（允許 origin 帶 header、非允許 origin 不帶 header）；瀏覽器端全流程手動驗證因故未執行，建議之後補測

## 5. `apps/liff` 骨架

- [x] 5.1 Monorepo 內新增 LIFF 前端 app 目錄與基礎建置設定（框架、build script）——與 `apps/admin` 不同，選用輕量 Vite + Vue3 + vue-router SPA（非 Nuxt），`dev` port 3006，`API_BASE_URL` 透過 vite `envDir` 指向根目錄 `.env` 並以 `define` 注入為 `import.meta.env.VITE_API_BASE_URL`
- [x] 5.2 設定 `apps/liff` 使用 `packages/shared`——`package.json` 加入 `@saas-starter-kit/shared: workspace:*`，`HomePage.vue` 以 type-only import `AuthUser` 驗證解析正確；`pnpm --dir apps/liff build`／`lint`／`dev` 皆驗證通過

## 6. 部署設定

- [x] 6.1 `apps/server` 撰寫 Dockerfile，設定 Cloud Run 部署（`min-instances: 0`，設定合理 CPU/記憶體與 `max-instances` 上限控制成本）——新增 `apps/server/Dockerfile`（multi-stage：monorepo root 為 build context，`pnpm install` + `pnpm --dir apps/server build`；runtime stage 只複製自足的 Nitro `.output`，不含 node_modules/workspace）與 `apps/server/service.yaml`（Cloud Run manifest，`minScale: 0`／`maxScale: 3`／1 vCPU／256Mi）；已用本機 `docker build` + `docker run` 驗證映像可建置並正確啟動（無憑證時依現有 `firebase-health.ts` 規則快速失敗，符合預期）
- [x] 6.2 Firebase 專案新增兩個 Hosting target（`apps/admin`、`apps/liff`）——新增 `firebase.json`（兩個 hosting target，`admin` → `apps/admin/.output/public`，已用 `pnpm --dir apps/admin generate` 驗證確實輸出到此路徑；`liff` → `apps/liff/dist`）與 `.firebaserc`（placeholder project id／site id，實際值待使用者提供，見 `docs/setup/deploy.md`）
- [x] 6.3 更新環境變數/設定：`apps/admin`、`apps/liff` 需知道 `apps/server` 的 Cloud Run URL——沿用既有 `API_BASE_URL` 機制（4.2／5.1 已接好 build-time 讀取），新增 `docs/setup/deploy.md` 說明部署時需將 `API_BASE_URL`、`CORS_ALLOWED_ORIGINS` 指向實際部署網址並重新 build

## 7. CI/CD

- [x] 7.1 CI/CD pipeline 新增依 git diff 路徑判斷 build/deploy 範圍的邏輯（`apps/server` → Cloud Run 部署；`apps/admin`/`apps/liff` → 對應 Hosting target）——git remote 為 GitHub（`gkfat/saas-starter-kit`），採 GitHub Actions；新增 `.github/workflows/deploy.yml`（`detect-affected` job 執行 `scripts/detect-affected-apps.ts` 算出受影響 app 清單，`deploy-server`/`deploy-admin`/`deploy-liff` 依清單條件觸發，僅 push 到 `main` 時部署）；部署所需 GitHub secrets 尚未設定，已列於 `docs/setup/deploy.md`
- [x] 7.2 `packages/shared` 變更時，觸發所有三個 app 的 build/deploy——`detectAffectedApps()` 內建規則：`packages/shared/`、`pnpm-workspace.yaml`、`pnpm-lock.yaml` 變更視為影響全部三個 app
- [x] 7.3 撰寫測試案例驗證路徑判斷邏輯正確性——新增 `scripts/detect-affected-apps.ts`（純函式 `detectAffectedApps`，CLI 包裝呼叫 `git diff` 取得變更檔案）與 `scripts/detect-affected-apps.test.ts`（6 個案例涵蓋單一 app／多 app／shared／lockfile／無關檔案），已接入根層級 `pnpm test`（新增 root `vitest` devDependency），`pnpm lint`／`pnpm test` 全部通過

## 8. 本機開發

- [x] 8.1 設定本機開發 ngrok/cloudflared 對外穿透流程文件——新增 `docs/setup/liff-local-dev.md`
- [x] 8.2 撰寫 LIFF endpoint 設定文件（如何將穿透網址註冊為 LIFF endpoint URL 供測試）——併入 `docs/setup/liff-local-dev.md` 第 3 節
- [x] 8.3 更新 CLAUDE.md 的 Commands 區段，反映新的 monorepo 指令（各 app 的 dev/build/test 指令）——僅更新 Commands 區段，其餘章節（Architecture 等）仍描述遷移前的單一 app 路徑，維持任務範圍不做額外改動

## 9. 驗證與收尾

- [x] 9.1 確認三個 app 皆可各自獨立部署，互不影響——`apps/server` 用 Dockerfile 獨立容器化（已 `docker build`/`docker run` 驗證），`apps/admin`/`apps/liff` 是各自獨立的 Firebase Hosting target（`firebase.json`）；CI（`.github/workflows/deploy.yml`）三個 `deploy-*` job 依 `detect-affected` 結果各自獨立觸發，互不依賴
- [x] 9.2 確認 `pnpm build`、`pnpm lint`、`pnpm test` 在 workspace 根層級可正確跑過所有 app——三者皆於根目錄實測執行成功（`apps/server`、`apps/admin`、`apps/liff` 皆 build 成功；lint 全部 Done；test 6+5 案例全過）
- [x] 9.3 確認 CORS 設定下，`apps/admin`、`apps/liff` 皆可正常呼叫 `apps/server`——`.env`/`.env.example` 的 `CORS_ALLOWED_ORIGINS` 補上 `http://localhost:3006`（liff dev port）；實測啟動 `apps/server` 後以 curl 驗證 origin 3005、3006 皆正確收到 CORS 允許 headers，未列入清單的 origin 則無 CORS header
- [x] 9.4 交接給 `add-line-liff-identity`：確認 `apps/server`、`apps/liff` 骨架可承接 LINE 登入邏輯實作——`apps/liff` 已具備可運作的 Vite+Vue3+vue-router SPA 骨架與 `@saas-starter-kit/shared` 依賴，`apps/server` 的 CORS/middleware pipeline 已就緒；`modules/identity` 尚未建立，留給 `add-line-liff-identity` 接續
