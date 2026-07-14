## Context

目前 SaaS Starter Kit 所有 UI 文字均為硬編碼中文字串，散落在 pages/、components/、layouts/ 的 `.vue` 檔案中。Nuxt 3 SPA 模式下可直接使用 `@nuxtjs/i18n` 模組，無 SSR hydration 問題。

## Goals / Non-Goals

**Goals:**

- 整合 `@nuxtjs/i18n` 至 Nuxt 3 SPA 專案
- 支援繁體中文（zh-TW，預設）與英文（en）
- 所有 UI 文字抽取至語系檔
- 提供語言切換 UI（AppHeader）
- 語言偏好持久化至 `localStorage`

**Non-Goals:**

- 不翻譯 server 端回傳的錯誤訊息（API error messages 保持英文）
- 不支援 RTL 語言
- 不實作後端語系（Firestore 資料不多語化）
- 不動態載入語系檔（bundle size 非瓶頸，demo 專案）

## Decisions

### 1. 選用 `@nuxtjs/i18n` v9

**選擇**：使用 `@nuxtjs/i18n`（Nuxt 官方模組，v9 支援 Nuxt 3）  
**理由**：官方支援、與 Nuxt 3 整合最佳、自動注入 `$t()` / `useI18n()`、支援 `localStorage` 策略  
**替代方案**：`vue-i18n`（需手動整合）、自製 store（過度工程）

### 2. 語系策略：`no_prefix`

**選擇**：`strategy: 'no_prefix'`（不產生 `/zh-TW/...` 路由前綴）  
**理由**：SPA 模式下保持 URL 簡潔，語言切換不影響路由；`localStorage` 儲存偏好  
**替代方案**：`prefix_except_default`（產生 `/en/...` 路由，對此 demo 過於複雜）

### 3. 語系檔格式：JSON flat key

**選擇**：`locales/zh-TW.json`、`locales/en.json`，flat 結構（`auth.login`、`nav.dashboard`）  
**理由**：易於維護，namespace 分組讓翻譯定位清晰  
**替代方案**：YAML（需額外 loader）、nested object（與 flat 等效，選 flat 更易 diff）

### 4. 語言切換位置：AppHeader

**選擇**：在 `AppHeader.vue` 右上角加入語言切換按鈕（icon + dropdown）  
**理由**：全域可見、符合慣例；不需要新建頁面

## Risks / Trade-offs

- **硬編碼文字遺漏** → 透過 lint rule 或 grep 在 tasks 中列出所有需替換的 `.vue` 檔，逐一確認
- **`@nuxtjs/i18n` v9 breaking changes** → 安裝前確認 Nuxt 3 相容版本；`pnpm add @nuxtjs/i18n`
- **Vuetify 元件內建文字（如日期 picker）** → 本次 Non-Goal，不處理 Vuetify 自帶語系
