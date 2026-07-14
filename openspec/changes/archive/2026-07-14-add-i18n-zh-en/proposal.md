## Why

目前所有 UI 文字均為硬編碼繁體中文，無法切換語言，限制了國際化擴展能力。導入 i18n 可讓應用支援多語系，並為未來增加更多語言奠定基礎。

## What Changes

- 安裝 `@nuxtjs/i18n` 模組並整合至 Nuxt 3 SPA 模式
- 新增語系檔：`locales/zh-TW.json`（繁體中文，預設）、`locales/en.json`（英文）
- 所有頁面、元件中的硬編碼文字改為 `$t()` / `useI18n()` 呼叫
- 提供語言切換 UI（AppBar 或 Settings 中的 Language Switcher）
- 語言偏好儲存至 `localStorage`，重載後保持選擇

## Capabilities

### New Capabilities

- `i18n`: 多語系支援，提供繁中（zh-TW）與英文（en）兩種語言，預設繁中；含語系檔管理與語言切換 UI

### Modified Capabilities

（無現有 spec 需更新）

## Impact

- **新增依賴**：`@nuxtjs/i18n`（Nuxt 官方 i18n 模組）
- **修改 `nuxt.config.ts`**：加入 `@nuxtjs/i18n` module 設定
- **新增 `locales/` 目錄**：`zh-TW.json`、`en.json`
- **修改所有包含 UI 文字的 `.vue` 檔案**：pages/、components/、layouts/
- **不影響 server API、Firestore schema、auth flow、RBAC**
