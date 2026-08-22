## Why

會員系統目前沒有任何「預約」能力。新增一個可透過 feature flag 獨立啟用/停用的預約模組，讓會員可在 LIFF 端預約後台設定的服務項目時段，後台可管理服務項目、時段與審核，並在狀態變化時透過 LINE 通知會員。

## What Changes

- 新增後台服務項目（Service）管理：名稱、說明、容量上限、審核模式（自動確認 / 人工審核）、啟用狀態；建立時可選擇套用既有時段樣板或稍後設定
- 新增後台時段（Time Slot）管理：隸屬於服務項目，含起訖時間與容量上限；管理頁以月曆呈現、一次一個月份，套用樣板僅產生當月草稿，需明確按下「設定完成」才寫入，不提供獨立的「新增時段」入口（直接點選日期調整當日時段）
- 新增後台時段樣板（Slot Template）：以「每週星期幾」規律（而非具體日期）定義營業日、每日時段起訖與切分粒度，可重複套用到不同月份
- 新增 LIFF 端會員預約流程（四步驟）：選擇服務項目 → 月曆選日期＋依粒度切分的時段 chip → 選填服務人員 → 確認頁彙總後送出，依服務項目審核模式決定初始狀態（已確認 / 待審核）
- LIFF 首頁新增預約摘要卡片（顯示會員最近一筆即將到來的預約），點擊導向「我的預約」頁面查看細節；原服務項目列表頁內的「我的預約」進入點移除
- 新增後台預約審核與查詢：對待審核預約核准/拒絕；依服務項目/時段/狀態/會員/人員篩選預約列表
- 新增會員自助取消預約（LIFF）
- 新增預約狀態變化的 LINE 通知：會員只要以 LIFF 登入即可建立預約，**不強制**要求先加專案綁定的 LINE 官方帳號好友；若會員尚未加好友，通知會靜默送達失敗，此為已知的最佳努力（best-effort）行為，不阻斷預約流程本身——**仍是全新外部整合，專案目前完全沒有 LINE Messaging API 串接（無 channel 憑證）**，具體整合方式在 design.md 中列為待決策項，不在本次 proposal 假設已有解法
- 新增 `booking` feature flag（比照既有 `packages/shared/feature-flags.ts` 機制），停用時 API 拒絕、後台導覽隱藏、LIFF 頁面不可直接進入
- 新增 Firestore collections：`booking_services`、`booking_time_slots`、`bookings`（`booking_providers` 是否需要視 design 階段確認 Provider 範圍而定）

## Capabilities

### New Capabilities

- `booking-service-management`: 後台管理服務項目與時段（名稱、容量、審核模式、時段起訖與容量）；管理時段樣板（每週星期幾規律）並以月曆草稿方式套用；管理服務人員（roster 上下架、每週出勤時段、服務項目指派）
- `booking-liff`: LIFF 端會員瀏覽服務項目/依日期分組的時段、選填服務人員（依所選時段篩選出可指派的人員）、確認後建立預約、取消自己的預約
- `booking-review`: 後台審核待審核預約、查詢/篩選預約列表
- `booking-line-notification`: 預約狀態變化的 LINE 通知（全新外部整合；會員無需為 LINE 好友即可預約，通知為 best-effort，非強制前提）

### Modified Capabilities

- `feature-flags`: 新增 `booking` feature flag，比照既有 auditLog/loginLog/level/coupon/points/event 的實作模式（環境變數 `FEATURE_BOOKING_ENABLED`、`runtimeConfig.public.featureFlags`、API 拒絕 + 後台導覽隱藏 + 前端頁面導向）

## Impact

- **新增程式碼**：`apps/server/server/modules/booking/`（service.ts + repo.ts）、對應 `apps/server/server/api/admin/booking/*`（含新增的 `DELETE /api/admin/booking/services/[id]/slots/[slotId]`、`GET`/`POST /api/admin/booking/providers`、`PATCH /api/admin/booking/providers/[id]`）、`apps/server/server/api/liff/booking/*`（含新增的 `GET /api/liff/booking/providers?timeSlotId=`，依時段篩選可指派人員）、`apps/server/server/api/internal/booking/process-overdue-bookings.post.ts`
- **修改程式碼**：`packages/shared/feature-flags.ts`（新增 `Booking` flag）、`apps/admin` 導覽/路由守衛（新增預約管理頁面與導覽項目）、`apps/liff` 新增預約相關頁面
- **新增外部依賴**：LINE Messaging API（channel access token/secret，需新增環境變數，比照既有 `LINE_CHANNEL_ID`/`LINE_CHANNEL_SECRET` 的管理方式）——具體串接方式待 design 階段確認
- **新增 Firestore collections**：`booking_services`、`booking_time_slots`、`bookings`（`booking_providers` 待確認）
- **不影響**：既有 events/points/coupons/level 模組不需修改（不整合會員等級/點數，明確排除在本次範圍外）
