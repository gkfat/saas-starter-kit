## 1. 前置決策確認（實作前必須先解決，見 design.md Open Questions）

- [x] 1.1 確認 LINE Messaging API channel 憑證管理方式與通知內容/時機規則 — 憑證/內容規則仍未定案；booking.notifier.ts 依 D4 只落地介面 + log-only 預設實作，不阻塞核心流程
- [x] 1.2 確認 Provider 是否需要獨立管理實體 — 依 D5 落地最小 Entity（id/name）
- [x] 1.3 確認會員取消預約的時間窗規則 — 沿用 spec 既定規則「時段尚未開始」
- [x] 1.4 確認逾期未審核預約的門檻與處理規則 — 2026-08-20 使用者確認：reviewDeadlineAt = timeSlot.startAt；逾期自動轉 rejected 並釋放容量

## 2. Shared 與 Feature Flag

- [x] 2.1 於 `packages/shared/feature-flags.ts` 的 `FeatureFlag` 新增 `Booking: 'booking'`
- [x] 2.2 於 `.env.example` 新增 `FEATURE_BOOKING_ENABLED` 說明（比照既有 flag 註解風格）
- [x] 2.3 於 `packages/shared/dto/` 新增 `booking.ts`，定義 Service/TimeSlot/Booking 的請求與回應型別（對應 `openspec/analysis/api-model.yaml` schema）

## 3. Server：Booking 模組核心（service/repo）

- [x] 3.1 建立 `apps/server/server/modules/booking/` 目錄結構（`service.ts`、`repo.ts`、`index.ts`）
- [x] 3.2 repo：實作 `booking_services` 的 CRUD 操作
- [x] 3.3 repo：實作 `booking_time_slots` 的 CRUD 操作
- [x] 3.4 repo：實作 `bookings` 的建立（含 Firestore transaction：讀取時段計數 → 驗證容量 → 寫入預約 → 更新計數）
- [x] 3.5 repo：實作 `bookings` 的狀態轉移（審核核准/拒絕、取消），皆在 transaction 內同步更新對應時段計數
- [x] 3.6 repo：實作 `bookings` 依 serviceId/timeSlotId/status/memberId/providerId 篩選查詢
- [x] 3.7 service：實作服務項目/時段的建立、編輯、驗證邏輯（對應 `booking-service-management` spec 的驗證規則，例如 capacity 不可低於使用量）
- [x] 3.8 service：實作預約建立流程（容量檢查、approvalMode 判斷初始狀態、可選 providerId）
- [x] 3.9 service：實作預約取消流程（僅本人、時段尚未開始才可取消）
- [x] 3.10 service：實作預約審核流程（僅允許 pendingReview → confirmed/rejected 轉移）

## 4. Server：Admin API 路由

- [x] 4.1 `POST /api/admin/booking/services`、`GET /api/admin/booking/services`（feature flag + 權限檢查）
- [x] 4.2 `PATCH /api/admin/booking/services/[id]`
- [x] 4.3 `GET /api/admin/booking/services/[id]/slots`、`POST /api/admin/booking/services/[id]/slots`
- [x] 4.4 `PATCH /api/admin/booking/services/[serviceId]/slots/[slotId]`
- [x] 4.5 `GET /api/admin/booking/bookings`（篩選查詢）
- [x] 4.6 `PATCH /api/admin/booking/bookings/[id]`（審核核准/拒絕）
- [x] 4.7 於 `packages/shared/permissions.ts` 新增 booking 相關權限定義（例如 `booking:write`、`booking:review`），並套用至上述路由
- [x] 4.8（新增，原 tasks.md 未列出但 api-model.yaml API-007/API-008 已定義）`GET`/`POST /api/admin/booking/providers`、`PATCH /api/admin/booking/providers/[id]` — 實作時確認 D5 原「全域最小 Entity、不依服務項目篩選」的排除範圍不成立：新增 `enabled`（roster 上下架）、`workingHours`（每週出勤時段，形狀比照 Slot Template）、`serviceIds`（服務項目指派，多對多）欄位與對應 admin 管理頁（`/admin/booking/providers`），`GET /api/liff/booking/providers?timeSlotId=` 依此三項篩選可指派人員清單（design.md D5 已同步修正，`booking-service-management`/`booking-liff` spec 已新增/修正對應 Requirement）

## 5. Server：LIFF API 路由

- [x] 5.1 `GET /api/liff/booking/services`（僅回傳 enabled）
- [x] 5.2 `GET /api/liff/booking/services/[id]/slots`
- [x] 5.3 `GET /api/liff/booking/bookings`（僅回傳自己的預約）
- [x] 5.4 `POST /api/liff/booking/bookings`（建立預約；不依賴 LINE 整合，可獨立於第 6 節完成）
- [x] 5.5 `PATCH /api/liff/booking/bookings/[id]`（取消預約）

## 6. Server：LINE 通知整合（依賴任務 1.1；選配加值功能，不阻塞核心預約流程）

- [x] 6.1 定義 `LineNotifier` 介面（比照 design.md D4）
- [x] 6.2 實作通知發送邏輯，並串接至預約建立/審核/取消流程的狀態變化點（EVT-001~004）— 目前註冊的實作為 log-only stub（憑證/內容規則未定案，見 booking.notifier.ts 註解）
- [x] 6.3 確保通知發送失敗僅記錄、不拋出例外阻斷主流程（對應 booking-line-notification spec 的 NFR-002 情境）
- [x] 6.4 新增對應環境變數（channel 憑證等），比照 `LINE_CHANNEL_ID`/`LINE_CHANNEL_SECRET` 的管理方式

## 7. Server：內部排程端點（依賴任務 1.4）

- [x] 7.1 於 `PUBLIC_PATHS` 註冊 `/api/internal/booking/process-overdue-bookings`，比照 `requireLevelBatchSecret` 模式新增共享密鑰驗證
- [x] 7.2 依任務 1.4 的決策實作逾期預約的偵測與處理邏輯（自動轉 rejected + 釋放 pendingCount）

## 8. Admin 前端

- [x] 8.1 新增服務項目管理頁面（列表、建立、編輯、停用）
- [x] 8.2 新增服務項目下的時段管理（列表、建立、編輯）
- [x] 8.3 新增預約列表頁面（篩選：服務項目/狀態/會員；timeSlotId/providerId 篩選未做 UI，API 已支援）
- [x] 8.4 新增待審核預約的核准/拒絕操作
- [x] 8.5 於 `apps/admin/config/app-routes.ts` 與側邊欄導覽新增預約管理項目，並依 featureFlag 控制顯示
- [x] 8.6 booking 停用時直連頁面導向 `/dashboard` — 沿用既有 `auth.global.ts` 的 `flattenRouteFeatureFlags` 機制（同 events/coupons 慣例），未另開新邏輯

## 9. LIFF 前端

- [x] 9.1 新增服務項目瀏覽頁面
- [x] 9.2 新增時段選擇與建立預約頁面（含剩餘容量顯示）— 人員選擇未做：api-model.yaml 未定義 LIFF 端 provider 列表端點，且 D5/task 1.2 判定 provider 管理頁面本屬可回退範圍，故本次 LIFF 預約不支援指定人員（`providerId` 留空，欄位仍受後端支援，未來要補時只需加一個 LIFF provider 列表端點 + UI）
- [x] 9.3 新增「我的預約」列表頁面（含取消操作）
- [x] 9.4 依 feature flag 控制預約入口顯示與直連導向行為（`router.beforeEach` 依 `VITE_FEATURE_BOOKING_ENABLED` 導回 `/home`）

## 10. 測試與驗證

- [x] 10.1 撰寫 `apps/server/tests/` 下的整合測試：服務項目/時段 CRUD
- [x] 10.2 撰寫整合測試：預約建立的容量邊界情境（含併發搶最後名額）
- [x] 10.3 撰寫整合測試：審核流程狀態機（含非法狀態轉移被拒絕）
- [x] 10.4 撰寫整合測試：取消流程（本人/非本人、已開始/未開始）
- [ ] 10.5 撰寫整合測試：`booking` feature flag 停用時，各 API 回傳「功能已停用」— 比照 level.test.ts/coupons.test.ts 現況：此情境需另開一個 flag=false 的 server process，不適合併入單一 server process 的整合測試檔，本專案其餘模組亦未涵蓋，故此項維持未做
- [x] 10.6 執行 `pnpm lint` 與 `pnpm build`（server/admin/liff 全部）確認無誤
- [x] 10.7（部分）已透過 `pnpm dev:server` + `booking.test.ts`（12/12 通過）對 admin/liff 兩側 API 走過完整核心流程：建立服務項目 → 設定時段 → 會員預約（auto/manual）→ 審核（核准/拒絕/非法轉移）→ 取消（本人/非本人/已開始）→ 容量併發競爭；過程中發現並修正一個真實 bug（見下方 Bug Fix）。**未做**：admin/liff 前端頁面的實際點擊操作（受限於此環境無可登入的真實帳密/LINE 憑證），僅驗證到頁面呼叫的 API 本身正確

### Bug Fix（整合測試執行期間發現）

`booking.schema.ts` 的各 Zod schema 原本以 `Schema.parse()` 直接呼叫，驗證失敗時拋出未被攔截的 `ZodError`，h3 無法辨識該錯誤型別，最終回傳 500 而非預期的 400（`booking-service-management` spec 明確要求「缺少必填欄位 → 系統回傳驗證錯誤」）。修法：新增 `apps/server/server/shared/validation.ts` 的 `parseOrBadRequest()` helper（沿用專案既有 `api/profile/*.patch.ts` 的 `safeParse` + 手動 400 慣例），套用到所有 booking admin/liff route 的 body/query 驗證。範圍僅限本次新增的 booking 路由，未觸碰 events/level/coupons 等既有模組（它們有相同的潛在問題，但不在本次變更範圍內，若要修正建議另開一個 change）。

## 11. 時段樣板（Slot Template）— 使用者於 /opsx:apply 執行期間追加需求（2026-08-20，2026-08-21 修正為每週星期幾規律）

原 proposal/design/spec 未涵蓋此能力，屬 apply 階段的 fluid 追加範圍。2026-08-20 版本以「儲存具體日期陣列」實作；2026-08-21 使用者反饋修正為「儲存每週星期幾規律，不含具體日期」，並改為「套用當月為草稿 + 明確送出」的流程（design.md D6a/D6b/D6c、`booking-service-management` spec 已同步更新）。以下取代原 11.1–11.8。

- [x] 11.1 修改 `BookingSlotTemplate`（`packages/shared/dto/booking.ts`）：`dates: string[]` → `weekdays: number[]`（`0`=日～`6`=六，至少一項）；`CreateBookingSlotTemplateRequest`/`UpdateBookingSlotTemplateRequest` 同步調整
- [x] 11.2 Server：`booking.schema.ts` 驗證規則由「日期字串陣列非空」改為「`weekdays` 為 `0`–`6` 整數子集合、至少一項、不重複」；repo/service 儲存欄位同步調整（`bulkCreateTimeSlots` 的 dedupe 邏輯不變，不受影響）
- [x] 11.3 Server API：`GET/POST /api/admin/booking/slot-templates`、`PATCH/DELETE /api/admin/booking/slot-templates/[id]` 回應/請求 body 改用 `weekdays`；`POST /api/admin/booking/services/[id]/slots/bulk` 介面本身不變（仍接收展開後的具體 slots 陣列）
- [x] 11.4 Admin：新增 `WeekdayPicker.vue`（7 個 chip 複選）取代並刪除 `BusinessDaysCalendarPicker.vue`，用於 `BookingSlotTemplateFormDialog.vue`；預覽文字改為「每個營業日產生 N 個時段」（不再顯示總數，因總數需視套用月份而定）
- [x] 11.5 Admin：`~/utils/booking-slot-generation.ts` 新增 `weekdayDatesInMonth`/`generateDaySlots`/`generateTimeSlotsForMonth`（輸入「目標月份 + weekdays」），取代原本以具體日期陣列為輸入的 `generateTimeSlotsFromTemplate`；一天 × 粒度切分的核心邏輯不變
- [x] 11.6 Admin：`/admin/booking/slot-templates` 列表頁欄位由「日期清單」改為顯示「星期幾規律」（例如「一、三、五」）
- [x] 11.7 Admin：`/admin/booking/services/[id]/slots.vue` 改版為月曆檢視（一次一個月份，上方月份切換按鈕）；新增 `BookingDaySlotsDialog.vue` 取代並刪除 `BookingTimeSlotFormDialog.vue`，點擊月曆上某一天直接開啟當日時段/容量編輯（新增/刪除/調整，先落在前端草稿 `draftByDate`）；移除「新增時段」按鈕；`ApplyTemplateDialog.vue` 改為依目前檢視月份展開草稿並以 `applied` 事件回傳（不再直接呼叫 API）；新增「設定完成」按鈕，按下後才對草稿逐日 diff 持久化（新增走 bulk 端點、有異動的走既有 PATCH、被移除的走新增的 DELETE 端點，見 11.10）
- [x] 11.8 整合測試：更新既有 2 案例（dailyEndTime 驗證、樣板 CRUD）改用 `weekdays`；批次套用去重案例本就直接打 bulk 端點、不經過樣板欄位，未受影響。「不同月份套用同一樣板展開結果隨月份天數/星期對應正確」為純前端演算法（`weekdayDatesInMonth`/`generateTimeSlotsForMonth`），本專案前端無既有單元測試框架可掛載，改以獨立腳本驗證（2026 年 8 月 weekdays=[1,3,5] → 命中日期數與該月一/三/五實際天數相符）
- [x] 11.9 Admin 前端點擊操作（星期幾複選、月曆草稿互動、設定完成送出）未經瀏覽器實測——同 10.7 的限制，此環境無可登入的真實帳密/LINE 憑證
- [x] 11.10（新增，實作 11.7 時發現的缺口）`DELETE /api/admin/booking/services/[id]/slots/[slotId]`：原本後端完全沒有刪除單一時段的端點，但 11.7／`booking-service-management` spec 明確要求「點擊日期可直接刪除當天時段」；新增 `deleteBookingTimeSlot` service（拒絕刪除已有預約的時段，409）+ repo `deleteTimeSlot` + 對應 API route，並補上整合測試（未使用時段可刪除；已有預約的時段刪除被拒絕 → 409）

## 12. 服務項目建立套用樣板、LIFF 四步驟預約流程、服務列表 UI 修正 — 使用者於 2026-08-21 提出修正

對應 design.md D6c（服務項目建立時套用樣板）、D10（LIFF 四步驟流程）、`booking-service-management`/`booking-liff` spec 新增的 Requirements。

### 12.1 服務項目建立套用樣板

- [x] 12.1.1 Admin：`BookingServiceFormDialog.vue` 新增建立時的選項「套用時段樣板（選填既有樣板）」或「稍後設定」
- [x] 12.1.2 Admin：選擇套用樣板並建立成功後，導向該服務項目的時段管理頁（11.7 的月曆頁面，帶 `?applyTemplate=<id>` query），頁面 mount 時自動以該樣板展開當月為草稿（仍需使用者按「設定完成」才持久化）；選擇「稍後設定」則維持原有列表停留行為

### 12.2 服務列表 UI

- [x] 12.2.1 Admin：`/admin/booking/services/index.vue` 列表將 `enabled=false` 的項目顯示文字改為「未啟用」（`bookingServices.disabled` i18n 內容調整）
- [x] 12.2.2 Admin：同列表新增「說明」欄位，顯示 `description`

### 12.3 LIFF 四步驟預約流程

- [x] 12.3.1 Server：新增 `GET /api/liff/booking/providers`（feature flag 檢查；`/api/liff/*` 預設即需登入，沿用既有中介層機制；依 4.8 追加的 `timeSlotId` 查詢參數篩選可指派人員，見 design.md D5）
- [x] 12.3.2 LIFF：`~/utils/booking-api.ts` 新增 `fetchBookingProviders()`，`createBooking()` 支援選填 `providerId`
- [x] 12.3.3 LIFF：重構 `pages/booking/[serviceId].vue` 為「日期(月曆) + 時段 chip」選擇畫面——依既有 `fetchBookingTimeSlots` 回傳的 `startAt` 於前端依日期分組，月曆標示有時段的日期，選定日期後以時段起始時間（如「11:30」）為 chip 呈現當天時段
- [x] 12.3.4 LIFF：新增 `pages/booking/[serviceId]/provider.vue`「選擇服務人員」步驟（選填，來自 12.3.1 端點依 `timeSlotId` 篩選後的清單），可選「不指定」略過
- [x] 12.3.5 LIFF：新增 `pages/booking/[serviceId]/confirm.vue` 確認頁，彙總顯示服務項目/日期時間/人員（未選顯示「不指定」），按下確認才呼叫既有 `createBooking()`；確認前返回修改任一項不建立預約
- [x] 12.3.6 LIFF：`router.ts` 新增 `bookingProvider`/`bookingConfirm` 路由，皆維持 `featureFlag: 'booking'` 保護
- [x] 12.3.7 整合測試：新增 provider 相關案例（admin 建立完整設定人員 → LIFF 端不帶 `timeSlotId` 可查得清單 → 可指定人員建立預約）；修正原案例中人員未設定 `workingHours`/`serviceIds` 卻預期可指定建立預約的錯誤假設（實測發現 `createBooking` 會驗證可指派規則，回傳 409，見 12.3.8）
- [x] 12.3.8（新增，本次回頭校正 openspec 時發現的測試缺口，並在執行測試時進一步發現的行為）整合測試：`GET /api/liff/booking/providers?timeSlotId=` 依 `enabled`/`workingHours`/`serviceIds` 篩選可指派人員清單（未設定 workingHours/serviceIds、未指派服務、enabled=false、workingHours 不涵蓋該時段星期或時間，共 4 種不合格情境 + 1 種合格情境）；另外發現並補上 `createBooking` 本身也會驗證同一套可指派規則、對不可指派的 `providerId` 回傳 409（design.md D5、`booking-liff` spec 已同步補上此行為）

### 12.4 驗證

- [x] 12.4.1 執行 `pnpm lint` 與 `pnpm build`（server/admin/liff）確認無誤
- [x] 12.4.2 `pnpm dev:server` + `booking.test.ts` 全數通過（17/17）
- [ ] 12.4.3 Admin/LIFF 前端點擊操作未經瀏覽器實測——同 10.7/11.9 的環境限制

## 13. LIFF 首頁預約摘要卡片、移除服務列表頁的「我的預約」進入點 — 使用者於 2026-08-21 提出修正

對應 design.md D11、`booking-liff` spec 新增的「LIFF home page shows a summary of the member's next upcoming booking」Requirement。

- [x] 13.1 LIFF：新增 `components/booking/BookingSummaryCard.vue`，比照 `CouponSummaryCard.vue`/`PointsSummaryCard.vue` 慣例：載入會員預約清單，找出時間最接近且尚未開始（`status` 為 `confirmed`/`pendingReview`，對應時段 `startAt` 晚於目前時間）的一筆，顯示服務名稱與日期時段；無符合項目時 `emit('visible', false)` 不顯示卡片
- [x] 13.2 LIFF：`pages/home/index.vue` 加入 `BookingSummaryCard`（沿用 `showCoupon` 的 visible-toggle grid 慣例），點擊導向既有 `myBookings` 路由
- [x] 13.3 LIFF：`pages/booking/index.vue` 移除原本連到 `myBookings` 的圖示按鈕（`myBookings` 路由與頁面本身不變）
- [ ] 13.4 LIFF 前端點擊操作未經瀏覽器實測——同前述環境限制
