## Context

目前 `apps/server` 沒有任何檔案上傳能力，`server/shared/firebase-admin.ts` 只匯出 `adminAuth()` 與 `adminDb()`。系統本身沒有 tenant 概念，所有既有模組（`users`/`roles`/`coupons`/`points`/`level` 等）的 Firestore collection 都是扁平的 top-level collection，透過 `server/shared/firestore-prefix.ts` 的 `prefixCollection()` 加上 `dev_`/`prod_` 環境前綴（例如 `dev_users`），本次 `events` collection 沿用同一套機制。`apps/liff` 目前已有 `pages/coupons/index.vue` + `pages/coupons/[id].vue` 的列表/詳情頁模式，以及首頁 `onMounted` fetch 卡片元件（`CouponSummaryCard.vue`）可參考。RBAC 權限採 `resource:action` 字串（見 `packages/shared/permissions.ts`），角色權限存於 Firestore `role_permissions`，僅 `superadmin`/`admin`/`member` 三個角色。系統已有 feature flag 機制（`packages/shared/feature-flags.ts` + `nitro.config.ts` runtimeConfig，見 `Coupon` flag 的完整先例），本次比照套用。

該專案的 Firebase 方案為 Spark（免費）方案，不支援 Firebase Storage，因此圖片儲存改採 Cloudflare R2（已有 Cloudflare 帳號）。

## Goals / Non-Goals

**Goals:**

- Admin 後台可建立/編輯/刪除活動，含 banner 圖片上傳、走期、多行文字文宣
- LIFF 已登入會員可取得「目前上檔中」的活動清單並查看詳情
- 圖片上傳與儲存走 Cloudflare R2，維持零/低額外費用

**Non-Goals:**

- 不做即時推播（Realtime Database / WebSocket / Push 通知），LIFF 端以進頁 fetch 取得資料即可
- 不做 richtext 編輯器，文宣僅支援多行純文字
- 不做活動的「即將開始」預告邏輯，僅判斷「目前上檔中」
- 不做活動點閱/轉換數據分析
- 不做圖片裁切、多尺寸產生等進階圖片處理
- 不做獨立的活動列表頁，LIFF 首頁輪播即為完整的上檔中活動清單

## Decisions

### 1. 新增 `modules/events`，架構比照既有 `modules/roles` / `modules/users`

`server/modules/events/{events.schema.ts, events.repo.ts, events.service.ts, index.ts}`。`events.repo.ts` 封裝 Firestore CRUD（collection: `prefixCollection('events')`，扁平 top-level，與 `users`/`roles`/`coupons` 同一套機制），`events.service.ts` 處理業務規則（走期驗證、啟用狀態判斷、banner 上傳/刪除協調），`api/admin/events/*` 與 `api/liff/events/*` 都透過 `index.ts` 匯出的 service 呼叫，不重複實作查詢邏輯。

理由：與現有模組分層規則一致，admin 與 liff 兩端共用同一份「目前上檔中」判斷邏輯，避免邏輯分岔。

### 2. 圖片上傳：admin 直接以 multipart 上傳給 server API，server 用 R2（S3-compatible API）寫入

Firebase 專案為 Spark 免費方案，不支援 Firebase Storage，因此改用 Cloudflare R2（已有 Cloudflare 帳號，需新建 Public Bucket 與自訂域名，屬本 change 的前置作業，見 Migration Plan）。

新增 `server/shared/r2-storage.ts`，仿照 `firebase-admin.ts` 的 lazy singleton 模式，匯出 `r2Client()`（`@aws-sdk/client-s3` 的 `S3Client`，指向 R2 endpoint）。新增依賴 `@aws-sdk/client-s3`。

流程：`POST /api/admin/events`（建立，不含圖片）→ 若使用者有選圖，admin 前端接著呼叫 `POST /api/admin/events/:id/banner`（multipart）：接收檔案 → 驗證 MIME type（僅允許 image/png, image/jpeg, image/webp）與檔案大小上限（如 5MB）→ 寫入 R2 `events/{eventId}/banner.{ext}` → 組成公開 URL（Public Bucket + 自訂域名，永久有效，不用簽發 presigned URL）→ 回傳 URL 存入 Firestore `events` document 的 `bannerUrl` 欄位。兩個 API 呼叫全部成功，admin 的建立 Dialog 才視為完成。

刪除活動、或更換 banner 時，`events.service.ts` 同步呼叫 R2 delete object 清除舊檔，避免孤立檔案累積。

理由：Server 端驗證檔案型別/大小比純前端驗證更安全（符合 security 規則的 runtime validation 原則）；R2 免費額度大、無流出費，S3-compatible API 生態成熟。

替代方案：前端直接用 R2 presigned URL 或 Cloudflare Worker 代理上傳。放棄原因：目前規模不需要，多一層代理/簽章邏輯與現有「所有寫入經過 server 集中驗證」的架構慣例不一致；presigned URL 也不適合長期存於 Firestore 的 `bannerUrl` 欄位（會過期）。

### 3. 「目前上檔中」判斷：由 server 用當下時間查詢，不做前端計算

`events.repo.ts` 查詢條件：`enabled == true AND startAt <= now AND endAt >= now`，依 `startAt` 排序。LIFF `/api/liff/events/active` 每次呼叫即時查詢，不快取。

理由：走期判斷邏輯集中在後端，避免前端時區/裝置時間誤差造成顯示不一致。

### 4. LIFF 端資料取得：進頁 fetch，不串接 Firebase Realtime Database

比較：

| 方案                       | 成本                                                                    | 即時性                | 複雜度                     |
| -------------------------- | ----------------------------------------------------------------------- | --------------------- | -------------------------- |
| REST + onMount fetch       | 現有 Cloud Run/Firestore 讀取費用（極低頻）                             | 需重新整理/進頁才更新 | 低，沿用既有架構           |
| Firebase Realtime Database | 需另開通 RTDB(Spark 方案有免費額度，但需雙寫 Firestore↔RTDB 維護一致性) | 活動異動即時推送      | 高，多一套資料源與同步邏輯 |

活動異動頻率低（營運手動排程，非高頻事件），即時推播帶來的效益遠低於維運兩套資料一致性的成本。採 REST 方案，LIFF 首頁輪播元件 `onMounted` 呼叫一次 `/api/liff/events/active`。

理由：符合 principles.md「避免過早最佳化」與「簡單優先」原則，且維持零額外費用（不使用 RTDB）。

### 5. 權限設計：新增 `Events` resource，比照 `Members` 的四動作模式

`packages/shared/permissions.ts` 新增：

```ts
Events: {
  Read: 'events:read',
  Write: 'events:write',
  Create: 'events:create',
  Delete: 'events:delete',
},
```

Admin API 依動作檢查對應權限；`packages/shared/roles.ts` 的 `RolePermissions.admin` 加入全部 `Events.*`（跟 `Members`/`AdminAccounts` 一樣全給 admin），`member` 不加。LIFF 公開 API 僅需登入態（既有 LIFF 會員 auth middleware），不需額外權限（一般會員皆可讀取活動）。

### 6. Feature flag：新增 `FeatureFlag.Event`，比照既有 `Coupon` flag 的完整模式

`packages/shared/feature-flags.ts` 新增 `Event: 'event'`；`apps/server/nitro.config.ts` 的 `runtimeConfig.public.featureFlags` 新增 `event: process.env.FEATURE_EVENT_ENABLED !== 'false'`（**預設 on**，跟 `level`/`points` 一樣，非跟 `coupon` 一樣預設 off）。

所有 `api/admin/events/*` 與 `api/liff/events/*` handler 開頭比照 `api/liff/coupons/*.get.ts` 的寫法檢查 flag，關閉時 `throw createError({ statusCode: 404, message: 'Feature disabled' })`。Admin 前端 `AppDrawer` 的「活動管理」選單項目用 `useFeatureFlags().isFeatureEnabled(FeatureFlag.Event)` 控制顯示。LIFF 前端不額外判斷 flag，`EventBannerCarousel` 沿用 `CouponSummaryCard` 的 try/catch 模式：fetch 失敗（含 404）時安靜隱藏整個區塊。

### 7. Admin/LIFF UI 模式：完全比照既有 coupons 慣例，不新建 UI pattern

- **Admin**：建立/編輯用 Dialog（`components/events/EventFormDialog.vue`，比照 `TemplateFormDialog.vue`），不做獨立的 `[id].vue` 編輯頁——這是目前 admin 端所有 CRUD 表單（`coupons`/`members`/`roles`）唯一使用的模式。Dialog 送出時內部先呼叫建立 API 取得 `id`，若有選圖再呼叫 banner 上傳 API，兩者皆成功才關閉 Dialog 並重整列表；任一步驟失敗則顯示錯誤，已建立的活動仍保留（不自動 rollback），使用者可重新編輯上傳圖片。
- **LIFF**：不做獨立的活動列表頁（`pages/events/index.vue`）。首頁 `AppHeader` 下方第一個區塊新增 `components/events/EventBannerCarousel.vue`，用 Vuetify 內建 `v-carousel`（`vuetify ^3.8.0` 已含，免新增套件）輪播上檔中活動 banner，`onMounted` fetch、無資料時整塊不渲染。詳情頁 `pages/events/[id].vue` 比照 `pages/coupons/[id].vue` 的結構（loading/error state、內容卡片），頁面底部提供固定定位的 `v-btn icon="mdi-close"`，`:to="{ name: 'home' }"` 返回首頁。

理由：與現有 UI 慣例保持一致（principles.md「Consistency with existing architecture」），不引入新的互動模式或元件庫。

## Risks / Trade-offs

- [風險] Cloudflare R2 bucket 與自訂域名建置（DNS、TLS）屬外部前置作業，非 code 可解決 → 緩解：列為 Migration Plan 第一步的硬性前置條件，實作前需先完成
- [風險] 圖片直接設為公開讀取（R2 Public Bucket）可能造成 URL 外流後仍可存取 → 緩解：僅存放非機敏行銷素材（banner 圖），可接受；不儲存個資相關圖片
- [風險] LIFF 端無快取，若首頁被頻繁進出觸發可能增加 Firestore 讀取次數 → 緩解：活動數量與存取頻率預期低，且專案本身對 log/讀取成本非優先考量（demo 專案）；若未來需要可加簡單記憶體快取
- [Trade-off] 不做即時推播，會員需重新整理才能看到活動異動 → 可接受，因活動上下架非高頻操作
- [Trade-off] Admin 建立流程拆成「建立」+「上傳圖片」兩支 API 呼叫，中途失敗會留下無 banner 的活動 → 可接受，使用者可直接重新編輯補上傳；不做交易式 rollback（過度設計）

## Migration Plan

1. **前置作業（外部，非 code）**：在 Cloudflare 建立 R2 Public Bucket 與自訂域名，取得 Account ID / Access Key / Secret / Bucket 名稱 / 公開域名
2. 新增 `Events` permission 常數、`FeatureFlag.Event`，更新 `RolePermissions.admin` 加入全部 `events:*`
3. 建立 `events` Firestore collection（`prefixCollection('events')`，無需遷移既有資料）
4. 新增 R2 相關 env var（`R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET_NAME`、`R2_PUBLIC_BASE_URL`、`FEATURE_EVENT_ENABLED`）並補上 `.env.example`
5. 部署順序：先上 server API + R2 設定 → 再上 admin 頁面 → 最後上 liff 頁面（可分批部署，彼此無破壞性依賴）
6. Rollback：任一階段有問題可個別回退對應 app 的部署，或將 `FEATURE_EVENT_ENABLED` 設為 `false` 立即關閉功能，不影響其他既有功能（新模組無反向依賴）
