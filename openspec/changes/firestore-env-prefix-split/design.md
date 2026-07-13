## Context

目前所有 Firestore collection 名稱為靜態字串（如 `users`、`roles`、`login_logs`），本機開發與正式站共用同一組資料，容易造成測試資料污染正式環境。

本設計在同一個 Firebase Project 內，透過 collection 名稱前綴（`dev_` / `prod_`）隔離環境，無需建立多個 Firebase Project。

## Goals / Non-Goals

**Goals:**

- 透過 `APP_ENV` 環境變數控制 Firestore collection 前綴
- 本機開發與 fallback 預設使用 `dev_`，正式站使用 `prod_`
- 所有 repo 層統一透過 helper 取得前綴，不散落各處

**Non-Goals:**

- 不建立多個 Firebase Project
- 不影響 Firebase Auth（Auth 本身不依賴 collection 前綴）
- 不影響前端 composables 或 middleware
- 不處理現有資料遷移（demo 專案，無遷移需求）

## Decisions

### 決策 1：前綴由 server-side helper 集中管理

在 `server/shared/firestore-prefix.ts` 提供兩個函式：

- `getCollectionPrefix(): 'dev_' | 'prod_'`：讀取 `process.env.APP_ENV`，非 `'production'` 一律回傳 `'dev_'`
- `prefixCollection(name: string): string`：回傳 `${prefix}${name}`

**理由**：前綴邏輯只有一處定義，避免各 repo 各自處理。`server/shared/` 是 server-only 純 infra 層，符合現有架構約束。

**替代方案考慮**：

- 用 Nuxt runtime config → 需要在 server context 外也能讀取，增加複雜度，不必要
- 環境前綴放 tenantId 路徑 → 改動更大且語意混亂，排除

### 決策 2：環境判斷依據 `APP_ENV`，而非 `NODE_ENV`

`NODE_ENV` 在 build 時期確定，`APP_ENV` 為執行期變數，可在同一個 build artifact 下切換 dev/prod 環境。

**理由**：Firebase App Hosting deploy 與本機 dev 用同一個 build，只需要切換環境變數即可，不需 re-build。

### 決策 3：multi-tenant 路徑結構不變

保持現有 `tenants/{tenantId}/{prefix}{collection}/` 結構。前綴加在 collection 名稱上，不加在 tenantId 路徑段。

**理由**：Firestore Security Rules 路徑撰寫更直覺，不需改動 tenantId 邏輯。

## Risks / Trade-offs

- [Risk] 既有資料在無前綴 collection 內，切換後舊資料不可見 → Mitigation: demo 專案無遷移需求，接受此行為；seed script 重跑即可
- [Risk] 忘記在某個 repo 套用 `prefixCollection()` → Mitigation: tasks 逐一列出所有 repo 檔案，code review 確認
- [Risk] `APP_ENV` 未設定時預設 `dev_`，若正式站忘記設定會讀到空資料 → Mitigation: `.env.example` 明確標示，deploy checklist 說明

## Migration Plan

1. 新增 `server/shared/firestore-prefix.ts`
2. 逐一修改各 `modules/*/repo.ts` 的 collection 名稱
3. `.env.example` 補充 `APP_ENV` 說明
4. 正式站部署時設定 `APP_ENV=production`
5. 重跑 seed script 在新前綴下建立初始資料

Rollback：移除 `APP_ENV` 或設為非 `production` 值即可回到 `dev_` 前綴。

## Open Questions

- 無
