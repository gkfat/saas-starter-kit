## 1. 時區資料與狀態

- [x] 1.1 新增 `shared/timezones.ts`：定義固定時區清單（顯示文字 ↔ IANA 值），含預設值 `Asia/Taipei`（UTC+8）
- [x] 1.2 新增 `stores/timezone.ts`（Pinia store）：state `selected`，初始化時讀取 `localStorage`（key 例如 `timezone_preference`），提供 `setTimezone(value)` action 同步寫回 `localStorage`
- [x] 1.3 補上 `stores/timezone.ts` 對應的型別（IANA 值型別可沿用 `shared/timezones.ts` 匯出的聯合型別，避免 `any`）

## 2. 共用格式化工具改造

- [x] 2.1 於 `utils/format-date.ts` 引入並 `dayjs.extend(utc)`、`dayjs.extend(timezone)`
- [x] 2.2 `formatDateTime()` 改為透過 `useTimezoneStore().selected` 取得時區並套用 `dayjs(value).tz(timezone).format(...)`，維持既有函式簽名（呼叫端不需修改）
- [x] 2.3 確認無值（`null`/`undefined`）情境仍回傳 `'-'`，行為與現況一致

## 3. 時區選擇 UI（改為頂部選單，非個人設定頁卡片）

- [x] 3.1 於 `components/layout/Breadcrumb.vue`（桌面版）語系按鈕右側新增時區選單（`v-menu`），選項資料來源為 `shared/timezones.ts` 清單（`-12` ~ `+12`，label 格式 `(UTC±hh:00) 城市`）；RWD 時改於 `components/layout/AppSettingsDrawer.vue` 右側選單內以 `v-select`（`outlined`）呈現，並修正其選單 `z-index` 遮蔽問題
- [x] 3.2 選擇變更時呼叫 `useTimezoneStore().setTimezone(value)`，並確認畫面上其他已渲染的時間欄位即時更新
- [x] 3.3 新增/更新 i18n 文案（zh-TW/en）：`settings.timezone` 等相關文案

## 4. 驗證

- [x] 4.1 `pnpm lint` 通過
- [x] 4.2 手動驗證：未曾選擇過時區時，任一顯示時間頁面預設以 UTC+8 呈現
- [x] 4.3 手動驗證：切換為 `UTC` 或其他時區後，重新整理頁面，選擇仍延續（`localStorage` 生效）
- [x] 4.4 手動驗證：切換時區後，`pages/admin/users/index.vue`、`pages/admin/logs/login.vue`、`pages/admin/logs/audit.vue`、`pages/users/index.vue` 的時間欄位皆同步反映新時區
- [x] 4.5 手動驗證：切換時區前後，對應頁面呼叫的 API 回應（Network tab）時間欄位仍為原始 UTC ISO 字串，未被前端行為污染
