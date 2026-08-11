## 0. 前置作業（外部，非 code）

- [x] 0.1 Cloudflare R2：新建 Public Bucket，綁定自訂域名（DNS + TLS），取得 Account ID / Access Key ID / Secret Access Key / Bucket 名稱 / 公開域名

## 1. Shared 型別、權限與 Feature Flag

- [x] 1.1 `packages/shared` 新增 `Event` DTO/型別（id, title, bannerUrl, copyText, startAt, endAt, enabled, createdAt, updatedAt）
- [x] 1.2 `packages/shared/permissions.ts` 新增 `Events: { Read, Write, Create, Delete }` 及對應 `PermissionMeta`
- [x] 1.3 `packages/shared/roles.ts` 的 `RolePermissions.admin` 加入全部 `Events.*`（`member` 不加）
- [x] 1.4 `packages/shared/feature-flags.ts` 新增 `FeatureFlag.Event: 'event'`

## 2. Server：R2 Storage 基礎設施

- [x] 2.1 安裝 `@aws-sdk/client-s3`
- [x] 2.2 新增 `apps/server/server/shared/r2-storage.ts`（比照 `firebase-admin.ts` 的 lazy singleton 模式，匯出 `r2Client()`，指向 R2 endpoint）
- [x] 2.3 `apps/server/nitro.config.ts` `runtimeConfig` 新增 R2 相關設定與 `public.featureFlags.event`（`FEATURE_EVENT_ENABLED !== 'false'`，預設 on）
- [x] 2.4 更新 `.env.example` 補上 `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET_NAME`、`R2_PUBLIC_BASE_URL`、`FEATURE_EVENT_ENABLED`

## 3. Server：events 模組

- [x] 3.1 新增 `server/modules/events/events.schema.ts`（Zod schema：建立/更新/查詢參數）
- [x] 3.2 新增 `server/modules/events/events.repo.ts`（Firestore CRUD，collection: `prefixCollection('events')`；含「目前上檔中」查詢方法）
- [x] 3.3 新增 `server/modules/events/events.service.ts`（走期驗證、banner 上傳協調：上傳新圖→寫入 Firestore→刪除 R2 舊圖；刪除活動時一併刪除 R2 對應檔案）
- [x] 3.4 新增 `server/modules/events/index.ts`（對外匯出）

## 4. Server：Admin API

（以下 API 開頭皆需檢查 `FeatureFlag.Event`，關閉時回 404，比照 `api/admin/coupons/*`）

- [x] 4.1 新增 `api/admin/events/index.get.ts`（列表，需 `events:read`）
- [x] 4.2 新增 `api/admin/events/index.post.ts`（建立，需 `events:create`）
- [x] 4.3 新增 `api/admin/events/[id].patch.ts`（更新，需 `events:write`）
- [x] 4.4 新增 `api/admin/events/[id].delete.ts`（刪除，需 `events:delete`；一併刪除 R2 banner 檔案）
- [x] 4.5 新增 `api/admin/events/[id]/banner.post.ts`（圖片上傳，multipart，MIME/大小驗證，需 `events:write`；一併刪除 R2 舊檔案）

## 5. Server：LIFF 公開 API

（以下 API 開頭皆需檢查 `FeatureFlag.Event`，關閉時回 404，比照 `api/liff/coupons/*`）

- [x] 5.1 新增 `api/liff/events/active.get.ts`（回傳目前上檔中活動清單，依 `startAt` 排序，需登入態）
- [x] 5.2 新增 `api/liff/events/[id].get.ts`（活動詳情，僅回傳目前上檔中的活動，需登入態）

## 6. Admin 前端

- [x] 6.1 新增 `pages/admin/events/index.vue`（活動列表，顯示狀態：即將開始/上檔中/已結束/停用）
- [x] 6.2 新增 `components/events/EventFormDialog.vue`（Dialog 形式，比照 `TemplateFormDialog.vue`：表單含標題、走期、文宣多行文字、啟用開關、圖片選擇；送出時先呼叫建立/更新 API，若有選圖再呼叫 banner 上傳 API，全部成功才關閉）
- [x] 6.3 新增對應 composable/API client（比照既有 `coupons` pattern）
- [x] 6.4 `AppDrawer` 新增「活動管理」選單項目，依 `events:read` 權限與 `FeatureFlag.Event` 顯示

## 7. LIFF 前端

- [x] 7.1 新增活動 API client（呼叫 `/api/liff/events/active`、`/api/liff/events/[id]`）
- [x] 7.2 新增 `components/events/EventBannerCarousel.vue`（Vuetify `v-carousel`，`onMounted` fetch 上檔中活動，無資料或 fetch 失敗時整塊不渲染，比照 `CouponSummaryCard.vue` 的 try/catch 模式），置於 `pages/home/index.vue` 的 `AppHeader` 下方第一個區塊
- [x] 7.3 新增 `pages/events/[id].vue` 詳情頁（banner、文宣全文、走期；比照 `pages/coupons/[id].vue` 的 loading/error 結構；底部固定 `v-btn icon="mdi-close"` 導回 `home`）

## 8. 測試與驗證

- [x] 8.1 `events.service.ts` 走期驗證（`endAt` 需晚於 `startAt`）單元測試
- [x] 8.2 「目前上檔中」查詢邏輯測試（含邊界時間、停用事件、未來/過去事件）
- [x] 8.3 圖片上傳 MIME type / 檔案大小驗證測試
- [x] 8.4 刪除活動 / 更換 banner 時 R2 舊檔案清除邏輯測試
- [x] 8.5 Admin API 權限檢查測試（無權限應被拒絕）
- [x] 8.6 LIFF API 未登入應被拒絕測試
- [ ] 8.7 Feature flag 關閉時 admin/liff events API 皆回 404 測試
- [x] 8.8 `pnpm build`、`pnpm lint`、`pnpm test` 全數通過
- [x] 8.9 手動驗證：admin 建立活動並上傳 banner → LIFF 首頁輪播顯示 → 點擊進入詳情頁 → close 按鈕返回首頁；停用/走期外的活動不顯示；刪除活動後 R2 檔案一併消失
