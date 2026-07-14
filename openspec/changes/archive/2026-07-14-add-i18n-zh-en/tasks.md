## 1. 安裝與設定

- [x] 1.1 安裝 `@nuxtjs/i18n` 套件（`pnpm add @nuxtjs/i18n`）
- [x] 1.2 在 `nuxt.config.ts` 加入 `@nuxtjs/i18n` module，設定 `locales`（zh-TW、en）、`defaultLocale: 'zh-TW'`、`strategy: 'no_prefix'`、`detectBrowserLanguage` 使用 localStorage
- [x] 1.3 建立 `locales/zh-TW.json`，包含所有 namespace 的繁中翻譯
- [x] 1.4 建立 `locales/en.json`，包含所有 namespace 的英文翻譯

## 2. 語言切換 UI

- [x] 2.1 在 `components/layout/Breadcrumb.vue` 加入語言切換按鈕（icon + v-menu dropdown，列出 zh-TW / en 選項）
- [x] 2.2 切換時呼叫 `useI18n().setLocale()` 並確認 localStorage 自動保存

## 3. 頁面文字 i18n 化 — Auth

- [x] 3.1 `pages/auth/login.vue`：替換所有硬編碼文字為 `$t()`
- [x] 3.2 `pages/auth/register.vue`：替換所有硬編碼文字為 `$t()`

## 4. 頁面文字 i18n 化 — 主要頁面

- [x] 4.1 `pages/dashboard/index.vue`：替換硬編碼文字
- [x] 4.2 `pages/profile/index.vue`：替換硬編碼文字
- [x] 4.3 `pages/users/index.vue`：替換硬編碼文字
- [x] 4.4 `pages/index.vue`：替換硬編碼文字（若有）

## 5. 頁面文字 i18n 化 — IAM / Admin

- [x] 5.1 `pages/iam/roles/index.vue`：替換硬編碼文字
- [x] 5.2 `pages/iam/permissions/index.vue`：替換硬編碼文字
- [x] 5.3 `pages/admin/index.vue`：替換硬編碼文字
- [x] 5.4 `pages/admin/roles/index.vue`：替換硬編碼文字
- [x] 5.5 `pages/admin/users/index.vue`：替換硬編碼文字
- [x] 5.6 `pages/admin/logs/login.vue`：替換硬編碼文字
- [x] 5.7 `pages/admin/logs/audit.vue`：替換硬編碼文字

## 6. 元件文字 i18n 化

- [x] 6.1 `components/layout/AppDrawer.vue`：導覽選單項目文字替換
- [x] 6.2 `components/layout/AppHeader.vue`：Header 文字替換（含 title）
- [x] 6.3 `components/layout/PageHeader.vue`：替換硬編碼文字（若有）
- [x] 6.4 `components/AppToast.vue`：替換硬編碼文字（若有）

## 7. 驗證

- [x] 7.1 `pnpm build` 確認 TypeScript 編譯無錯誤
- [x] 7.2 `pnpm lint` 通過
- [x] 7.3 啟動 dev server，切換語言確認所有頁面文字即時更新
- [x] 7.4 重新整理頁面確認語言偏好保持
- [x] 7.5 確認無 i18n key 字串裸露在 UI 上
