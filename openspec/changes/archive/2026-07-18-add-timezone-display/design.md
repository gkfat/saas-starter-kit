## Context

所有時間資料在 Firestore 與 API 回應中皆為 UTC ISO 8601 字串（例：`users.createdAt`、`login_logs`/`audit_logs` 的 `timestamp`）。前端目前唯一的格式化入口是 `utils/format-date.ts` 的 `formatDateTime()`，由 4 個頁面呼叫（`pages/admin/users/index.vue`、`pages/admin/logs/login.vue`、`pages/admin/logs/audit.vue`、`pages/users/index.vue`），內部直接用 `dayjs(value).format(...)`，會採用瀏覽器所在時區。專案已有 `dayjs` 依賴（無需新增套件），且 `dayjs/plugin/utc`、`dayjs/plugin/timezone` 已存在於 node_modules。個人設定頁 `pages/profile/index.vue` 已有 `ProfileInfoCard`、`LoginMethodsCard` 兩張卡片可參考擴充模式。i18n 語系選擇已有「瀏覽器 localStorage 儲存偏好」的既有模式（`detectBrowserLanguage.storageKey`）可參考。

## Goals / Non-Goals

**Goals:**

- 提供一個集中的時區狀態來源，預設 `UTC+8`，可由使用者於個人設定頁切換
- 選擇的時區持久化於 `localStorage`，跨 session 延續
- 全站所有時間顯示（現有 4 個呼叫點）改為套用所選時區，且切換後現有畫面即時反映（不需重整頁面）
- 不修改任何後端儲存/傳輸格式

**Non-Goals:**

- 不做伺服器端時區偏好儲存（不寫入 Firestore user 文件），純前端 `localStorage`
- 不支援自訂/任意時區輸入（僅提供固定清單）
- 不處理夏令時間（DST）動態切換邏輯以外的複雜情境（`dayjs-timezone` 已內建 IANA 規則，直接沿用其計算結果）
- 不新增後端 API 或 schema 變更

## Decisions

### 1. 以 Pinia store 管理時區狀態（而非純 composable + ref）

新增 `stores/timezone.ts`（比照 `stores/auth.ts` 風格），state 含 `selected: string`（IANA 時區字串或固定 UTC 偏移字串），初始化時從 `localStorage` 讀取，寫入時同步寫回 `localStorage`。`formatDateTime()` 透過 Pinia store（在元件外部用 `useTimezoneStore()`）取得目前時區。

**Alternative considered**：僅用一個模組級的 `ref`（無 Pinia）。因專案已用 Pinia 作為狀態管理標準（`stores/auth.ts`），且 Pinia store 在多元件間天然具備響應性，不需額外手刻事件廣播，故採用 Pinia 維持架構一致性。

### 2. `formatDateTime()` 改為讀取 store 而非新增參數

保持既有呼叫端 `formatDateTime(value)` 簽名不變（4 個呼叫點不需修改程式碼），函式內部改為：

```ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const store = useTimezoneStore();
  return dayjs(value).tz(store.selected).format('YYYY-MM-DD HH:mm');
}
```

由於是 SPA 模式（`ssr: false`），`utils/` 內呼叫 `useTimezoneStore()`（Nuxt/Pinia 的 auto-import）在瀏覽器執行環境下可行；不需要透過 props 逐層傳遞時區。

**Alternative considered**：讓 `formatDateTime` 多一個 `timezone` 參數，由各頁面自行從 store 取值傳入。會導致 4 個呼叫點都要修改，且未來新增顯示時間的頁面容易忘記傳參數，故不採用；集中在工具函式內部讀取 store 可保證「有顯示時間的地方都自動套用時區」不遺漏。

### 3. 固定時區清單，使用 IANA 時區名稱作為底層值

UI 顯示「UTC+8」等偏移量文字，但底層儲存/傳給 `dayjs.tz()` 的值使用 IANA 名稱（如 `Asia/Taipei` 對應 UTC+8），以便正確處理 DST（雖然本次固定清單挑選的時區皆無 DST 爭議，但沿用 IANA 名稱是 `dayjs-timezone` 官方建議用法，避免未來擴充時區清單踩雷）。清單於 `stores/timezone.ts` 或獨立 `shared/timezones.ts` 常數定義：

| 顯示文字      | IANA 值               |
| ------------- | --------------------- |
| UTC+8（預設） | `Asia/Taipei`         |
| UTC           | `UTC`                 |
| UTC+9         | `Asia/Tokyo`          |
| UTC-5         | `America/New_York`    |
| UTC-8         | `America/Los_Angeles` |

**Alternative considered**：直接用固定分鐘數偏移（`utcOffset()`）而非 IANA 名稱。`utcOffset` 不處理 DST，`America/New_York`/`America/Los_Angeles` 這類城市在夏令時間會有 1 小時誤差；用 IANA 名稱可讓 `dayjs-timezone` 自動處理，正確性更高，故採用。

## Risks / Trade-offs

- [`localStorage` 在無痕模式或使用者清除瀏覽器資料後遺失偏好] → 已在需求中定義：無偏好時 fallback 回預設 `UTC+8`，屬預期行為
- [`useTimezoneStore()` 在非元件情境（如純 util 函式）呼叫，需確認 Pinia 已於 Nuxt 生命週期內初始化] → SPA 模式下所有頁面渲染都在瀏覽器完成、Pinia 於 app 啟動時即掛載，`formatDateTime` 僅在畫面渲染時被呼叫，時機上不會早於 Pinia 初始化；此外專案既有 `useAuthStore()` 已有類似跨檔案呼叫模式可佐證可行
- [固定時區清單無法涵蓋所有使用者需求] → 屬本次刻意的 Non-Goal（不支援自訂時區），若未來需要可擴充清單常數，不影響核心機制

## Migration Plan

1. 新增 `dayjs/plugin/utc`、`dayjs/plugin/timezone` extend（於 `utils/format-date.ts` 或獨立初始化檔）
2. 新增 `shared/timezones.ts`（或等效常數檔）定義固定時區清單
3. 新增 `stores/timezone.ts`，處理 `localStorage` 讀寫與預設值
4. 修改 `utils/format-date.ts`，改用 store 提供的時區格式化
5. 於 `pages/profile` 新增時區選擇元件（比照現有 `ProfileInfoCard` 卡片樣式）
6. 補上 i18n 文案
7. 手動驗證 4 個既有顯示時間頁面切換時區後即時反映

無資料庫遷移，純前端變更，可隨時回滾（還原檔案即可）。

## Open Questions

（無）
