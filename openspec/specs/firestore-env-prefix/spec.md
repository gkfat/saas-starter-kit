# Firestore Env Prefix Spec

## Purpose

Provide environment-aware collection name prefixing so that dev and prod data are isolated within the same Firestore project.

## Requirements

### Requirement: 環境前綴 helper

系統 SHALL 提供 `getCollectionPrefix()` 函式，讀取 `process.env.APP_ENV`，當值為 `'production'` 時回傳 `'prod_'`，其餘情況（包含未設定）一律回傳 `'dev_'`。

#### Scenario: 正式站前綴

- **WHEN** `APP_ENV=production`
- **THEN** `getCollectionPrefix()` 回傳 `'prod_'`

#### Scenario: 本機開發前綴

- **WHEN** `APP_ENV` 未設定或為其他值
- **THEN** `getCollectionPrefix()` 回傳 `'dev_'`

### Requirement: collection 名稱套用前綴

系統 SHALL 提供 `prefixCollection(name: string): string` 函式，回傳 `${getCollectionPrefix()}${name}`。

#### Scenario: 套用正式前綴

- **WHEN** `APP_ENV=production`，呼叫 `prefixCollection('users')`
- **THEN** 回傳 `'prod_users'`

#### Scenario: 套用開發前綴

- **WHEN** `APP_ENV` 未設定，呼叫 `prefixCollection('users')`
- **THEN** 回傳 `'dev_users'`

### Requirement: 所有 repo 層使用 prefixCollection

所有 `modules/*/repo.ts` 內的 Firestore collection 存取 SHALL 透過 `prefixCollection()` 產生 collection 名稱，不得使用靜態字串。

#### Scenario: repo 使用動態前綴

- **WHEN** server 收到任何 API request
- **THEN** Firestore 操作的 collection 名稱包含對應環境前綴（`dev_` 或 `prod_`）

### Requirement: 環境變數宣告

`.env.example` SHALL 包含 `APP_ENV` 變數的說明與預設值範例（`development`），並標示正式站需設為 `production`。

#### Scenario: .env.example 包含 APP_ENV

- **WHEN** 開發者複製 `.env.example`
- **THEN** 可見 `APP_ENV` 欄位與說明文字
