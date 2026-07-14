## Why

Firestore 目前沒有區分開發與正式環境，本機開發與部署測試站的操作會污染正式資料。透過 collection 名稱前綴（`dev_` / `prod_`）在同一個 Firebase Project 內隔離兩個環境，避免開發操作影響正式資料。

## What Changes

- 新增 `VITE_APP_ENV` / `APP_ENV` 環境變數，決定執行期前綴（`dev_` 或 `prod_`）
- Firestore repo 層所有 collection 名稱統一透過 `getCollectionPrefix()` helper 動態加前綴
- 本機開發（`NODE_ENV=development`）與 fallback 預設使用 `dev_`
- 正式站（`APP_ENV=production`）使用 `prod_`
- `.env.example` 補充新環境變數說明

## Capabilities

### New Capabilities

- `firestore-env-prefix`: 根據執行環境自動決定 Firestore collection 前綴（`dev_` 或 `prod_`），確保開發與正式資料完全隔離

### Modified Capabilities

- `data`: Firestore 資料路徑結構加入環境前綴，所有 collection 名稱從靜態字串改為動態前綴字串

## Impact

- **server/shared/**: 新增 `firestore-prefix.ts` helper，提供 `getCollectionPrefix()` 與 `prefixCollection()` 工具函式
- **modules/\*/repo.ts**: 所有 Firestore collection 名稱改用 `prefixCollection()` 包裝（auth, users, logs, rbac 等模組）
- **環境變數**: `.env`, `.env.example` 新增 `APP_ENV`
- **不影響**: Auth 流程、RBAC 邏輯、middleware、前端 composables
