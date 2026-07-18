## Why

系統目前所有時間皆以 UTC ISO 字串儲存於 Firestore，前端統一透過 `utils/format-date.ts` 的 `formatDateTime()` 以瀏覽器本地時區格式化顯示。當使用者所在時區與伺服器/瀏覽器預設不同，或需要以固定時區（如台灣 UTC+8）檢視資料時，目前沒有可調整、可預期的時區顯示機制。需新增一個純前端的時區轉換機制，預設 UTC+8，並讓使用者可自行切換，切換後即時套用到所有顯示時間的地方（各表格、詳情等）。

## What Changes

- 新增時區顯示機制：純前端功能，不影響後端儲存格式（後端持續以 UTC ISO 字串儲存與傳輸）
- 預設時區為 `UTC+8`；使用者可在個人設定頁（`pages/profile`）選擇其他時區
- 使用者選擇的時區儲存於瀏覽器 `localStorage`，重新整理或下次造訪時延續上次選擇
- 全站所有顯示時間的地方（使用者列表、登入紀錄、稽核紀錄等表格）改為套用使用者所選時區，而非瀏覽器本地時區

## Capabilities

### New Capabilities

- `timezone-display`: 純前端時區顯示機制，提供時區狀態管理、格式化工具，並在個人設定頁提供選擇 UI，預設 UTC+8，選擇持久化於 localStorage

### Modified Capabilities

（無既有 spec 之需求異動；`admin-dashboard` 等既有頁面的時間欄位顯示行為改變，但其「顯示 createdAt/timestamp 欄位」需求本身未變，僅顯示所依據的時區來源改變，歸類於新能力 `timezone-display` 描述）

## Impact

- **前端共用工具**：`utils/format-date.ts` 改為依當前選擇時區格式化（引入 `dayjs` 的 `utc`、`timezone` plugin）
- **狀態管理**：新增時區偏好的 Pinia store（或擴充現有 store），初始化時讀取 `localStorage`，預設 `UTC+8`
- **UI**：`pages/profile` 新增時區選擇元件（下拉選單），選擇後立即套用
- **既有頁面**（不變更頁面邏輯，僅因共用工具行為改變而連動）：`pages/admin/users/index.vue`、`pages/admin/logs/login.vue`、`pages/admin/logs/audit.vue`、`pages/users/index.vue`
- **i18n**：新增時區選擇相關文案（zh-TW/en）
- **依賴**：沿用既有 `dayjs`，新增其 `utc`、`timezone` 官方 plugin（無新增第三方套件）
