## ADDED Requirements

### Requirement: Vuetify Theme Color Token 統一定義

系統 SHALL 在 `nuxt.config.ts` 集中定義 Vuetify light theme 的 color tokens，所有 Admin UI 元件 SHALL 使用 theme token 而非 hardcoded hex 值。

#### Scenario: Primary color 套用至 active 狀態

- **WHEN** sidebar nav item 或 tab 處於 active/selected 狀態
- **THEN** 元件 SHALL 顯示 `primary` color（#1967D2）的底線或背景

#### Scenario: 頁面背景為白色

- **WHEN** 使用者瀏覽任何 Admin 頁面
- **THEN** 主內容區背景 SHALL 為白色（`surface: #ffffff`），無灰色底色 card

---

### Requirement: 資料欄位使用 Monospace 字型

在表格、詳細資料顯示中的 ID、timestamp、技術性欄位 SHALL 使用 monospace 字型（`font-family: monospace` 或 Roboto Mono）。

#### Scenario: 使用者 UID 顯示

- **WHEN** Users 列表頁顯示使用者 UID 欄位
- **THEN** UID 值 SHALL 以 monospace 字型呈現

#### Scenario: Timestamp 欄位顯示

- **WHEN** Log 列表頁顯示 createdAt timestamp
- **THEN** timestamp 值 SHALL 以 monospace 字型呈現
