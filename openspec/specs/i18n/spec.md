# i18n Spec

## Requirements

### Requirement: 多語系模組整合

系統 SHALL 安裝並設定 `@nuxtjs/i18n` 模組，支援繁體中文（zh-TW）與英文（en），預設語言為 zh-TW。

#### Scenario: 初次載入預設語言

- **WHEN** 使用者首次開啟應用且無 localStorage 語言偏好
- **THEN** 系統 SHALL 以繁體中文顯示所有 UI 文字

#### Scenario: 語言偏好持久化

- **WHEN** 使用者切換語言後重新整理頁面
- **THEN** 系統 SHALL 保留上次選擇的語言（從 localStorage 讀取）

### Requirement: 語系檔結構

系統 SHALL 提供兩個語系檔 `i18n/locales/zh-TW.json` 與 `i18n/locales/en.json`，涵蓋所有頁面與元件的 UI 文字，以 namespace 分組（auth、nav、common、users、roles、permissions、logs、admin、profile、settings）。

#### Scenario: 語系鍵完整性

- **WHEN** 切換至英文語言
- **THEN** 系統 SHALL 顯示英文對應文字，不出現 i18n key 字串（如 `auth.login`）

#### Scenario: fallback 語言

- **WHEN** 某語系鍵在當前語言中不存在
- **THEN** 系統 SHALL fallback 至 zh-TW 顯示，不顯示空白或 key 字串

### Requirement: 語言切換 UI

系統 SHALL 提供語言切換控制項，允許使用者在繁中與英文之間切換：

- Desktop：位於 `Breadcrumb` 元件右側（breadcrumb 同一行）
- Mobile：位於 `AppHeader` append slot（cog icon），點擊後開啟右側滑入的 `AppSettingsDrawer`

#### Scenario: 切換語言即時生效

- **WHEN** 使用者選擇另一語言
- **THEN** 系統 SHALL 立即更新當前頁面所有 UI 文字，不需重新整理

#### Scenario: 當前語言標示

- **WHEN** 語言切換選單開啟
- **THEN** 系統 SHALL 標示目前已選的語言（check icon）

### Requirement: 頁面文字 i18n 化

所有包含硬編碼 UI 文字的 `.vue` 檔案 SHALL 改用 `$t()` 或 `useI18n().t()` 呼叫取代字串，涵蓋範圍：pages/（auth、dashboard、profile、users、iam、admin）、components/（layout/AppDrawer、AppHeader、AppSettingsDrawer、Breadcrumb）、layouts/。

#### Scenario: Auth 頁面文字切換

- **WHEN** 使用者在登入頁切換語言
- **THEN** 登入頁的標題、欄位 label、按鈕文字 SHALL 對應更新

#### Scenario: 導覽選單文字切換

- **WHEN** 使用者在任意頁面切換語言
- **THEN** AppDrawer 導覽選單項目文字 SHALL 對應更新

### Requirement: Mobile Settings Drawer

系統 SHALL 在 mobile 模式下提供右側滑入的設定面板（`AppSettingsDrawer`），使用 `Teleport to="body"` 實作以避免 z-index 衝突，z-index 9999。

#### Scenario: 開啟設定面板

- **WHEN** 使用者點擊 AppHeader 的 cog icon
- **THEN** 系統 SHALL 從右側滑入設定面板，並顯示半透明 scrim

#### Scenario: 關閉設定面板

- **WHEN** 使用者點擊 scrim 區域或 close button
- **THEN** 系統 SHALL 收合設定面板
