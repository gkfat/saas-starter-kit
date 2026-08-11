## Why

目前系統沒有任何機制讓管理員發佈活動宣傳內容給 LINE LIFF 端會員。行銷/營運需要能設定限時活動（banner + 圖片 + 文宣），並讓會員在 LIFF 開啟時看到當前上檔中的活動與通知，藉此提升活動曝光與轉換。

## What Changes

- 新增 admin 後台「活動管理」頁面：建立/編輯/刪除活動，設定標題、banner 圖片、走期（startAt / endAt）、文宣內容（多行純文字）、啟用狀態
- 新增圖片上傳能力：admin 上傳活動 banner 圖片至 **Cloudflare R2**（Public Bucket + 自訂域名），取得永久公開 URL 存入 Firestore；刪除活動或更換 banner 時同步清除 R2 舊檔
- 新增 `modules/events`（server）：`events` collection 的 CRUD service/repo，供 admin API 與 liff 公開 API 共用
- 新增 admin API：`/api/admin/events` CRUD（需對應 `Events.*` 權限）
- 新增 liff 公開 API：`/api/liff/events/active`，回傳目前上檔中（`startAt <= now <= endAt` 且 `enabled = true`）的活動清單，依 `startAt` 排序
- 新增 liff 首頁區塊：`AppHeader` 下方第一個區塊以輪播（carousel）呈現上檔中活動 banner，點擊進入活動詳情頁（顯示 banner、文宣全文、走期，底部提供返回首頁的 close icon button）；不另建獨立的活動列表頁
- liff 端採用既有 REST 架構（onMount fetch),不串接 Firebase Realtime Database — 活動異動頻率低，多一套即時通道的維運與資料一致性成本不划算，純 REST 已足夠且維持零額外費用
- 新增 `FeatureFlag.Event`（env `FEATURE_EVENT_ENABLED`，預設 on），admin 與 liff 所有 events API 依既有 coupons 模式檢查，關閉時回 404

## Capabilities

### New Capabilities

- `event-management`: 管理員在後台建立/編輯/刪除活動（banner 圖片、走期、文宣），含圖片上傳
- `event-notification-liff`: LIFF 端取得目前上檔中的活動清單與活動詳情

### Modified Capabilities

(無現有 capability 的需求變更)

## Impact

- **apps/server**: 新增 `server/modules/events/`（schema/service/repo/index，collection 走 `prefixCollection('events')`）、`server/api/admin/events/*`、`server/api/liff/events/*`；新增 `server/shared/r2-storage.ts`（`r2Client()`，比照 `firebase-admin.ts` 的 lazy singleton 模式）
- **apps/admin**: 新增 `pages/admin/events/index.vue`（列表）+ `components/events/EventFormDialog.vue`（建立/編輯，Dialog 形式，比照 `TemplateFormDialog.vue`）、對應 composable/API client、`AppDrawer` 依 `FeatureFlag.Event` 顯示選單項目
- **apps/liff**: 新增 `components/events/EventBannerCarousel.vue`（首頁輪播，Vuetify `v-carousel`）、`pages/events/[id].vue`（詳情頁，比照 `coupons/[id].vue`）與 API client；不新增列表頁
- **packages/shared**: 新增 Event DTO/型別、`Events.Read` / `Events.Write` / `Events.Create` / `Events.Delete` permission 常數、`FeatureFlag.Event`
- **RBAC**: 新增 `Events.*` 權限，全數加入 `admin` 角色（`member` 不加，跟現有模式一致）
- **Firestore**: 新增 `events` collection（`prefixCollection('events')` → `dev_events` / `prod_events`，扁平 top-level，與 `users`/`roles`/`coupons` 等既有模組同一套機制，不使用 tenant 前綴）
- **Cloudflare R2**: 新增 Public Bucket + 自訂域名（需在 Cloudflare 後台新建，帳號已具備），路徑規劃如 `events/{eventId}/banner.*`；改用 R2 的原因是 Firebase 專案為 Spark 免費方案，不支援 Storage
- **依賴**: 新增 `@aws-sdk/client-s3`（連接 R2 的 S3-compatible API）；圖片上傳需前端與 server 雙重檔案大小/型別驗證
