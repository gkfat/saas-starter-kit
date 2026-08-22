## Context

現有會員系統（`apps/server` Nitro API / `apps/admin` Nuxt 後台 / `apps/liff` LINE LIFF 會員端 / `packages/shared`）沒有任何預約能力。本次新增的預約模組需要：

- 沿用既有模組分層慣例（`modules/<name>/service.ts` → `repo.ts` → Firestore；`api/` 依 `admin`/`liff`/`internal` 分資料夾）
- 沿用既有 feature flag 機制（`packages/shared/feature-flags.ts` 的 `FeatureFlag` enum + `FEATURE_<NAME>_ENABLED` + `runtimeConfig.public.featureFlags`）
- 整合一項全新外部依賴：LINE Messaging API（預約狀態變化的推播通知）。專案目前僅有 LINE Login/LIFF ID Token 驗證（`apps/server/server/modules/auth/auth.line.ts`），**完全沒有** channel access token。會員只要以 LIFF 登入即可建立預約，**不要求**好友狀態，因此不需要額外的好友狀態 webhook/追蹤機制——通知對非好友會員會靜默送達失敗，屬 best-effort 行為

本設計基於 `openspec/analysis/` 下的系統分析六站產出（`context.yaml`、`requirements.yaml`、`use-cases.yaml`、`domain-model.yaml`、`api-model.yaml`、`data-model.yaml`、`traceability.yaml`），完整追溯鏈與待確認項見該目錄。

## Goals / Non-Goals

**Goals:**

- 後台可管理服務項目（Service）與時段（Time Slot），每個服務項目可設定容量與審核模式（自動確認 / 人工審核）
- 會員可在 LIFF 端瀏覽、預約、取消自己的預約
- 後台可審核待審核預約、查詢/篩選預約列表
- 容量控制在併發下不超賣（Firestore transaction）
- 整個模組可透過 `booking` feature flag 完全啟用/停用，行為與既有 flag 模組一致

**Non-Goals:**

- 不整合 level（會員等級）/ points（點數）模組（例如依等級開放預約權限、消耗點數預約）——明確排除
- 不在本次定案 LINE Messaging API 的完整實作細節（channel 憑證取得流程、webhook 基礎設施本身可能是更大範圍的專案級整合，非本模組獨有）——本設計只定義 booking 模組如何**使用**這項能力的介面，不建置這項能力本身
- 不做 Provider（人員）的完整資源管理（例如人員自身排班、多服務指派）——若最終確認需要，屬未來擴充

## Decisions

### D1. Aggregate/Collection 邊界：Service / TimeSlot / Booking 各自獨立

TimeSlot 不併入 Service、Booking 不併入 TimeSlot，三者為獨立 Firestore top-level collection（`booking_services`、`booking_time_slots`、`bookings`），以 id 欄位互相參照（無 FK，符合既有 Firestore 慣例，比照 `coupon_instances` 用 `couponId` 參照 `coupons` 的模式）。

理由：

- Service 屬性變更頻率低，若併入 TimeSlot 會讓高頻的預約寫入牽連到低頻資料
- TimeSlot 的容量計數（`confirmedCount`/`pendingCount`）是預約流程中寫入最頻繁、最需要交易保護的邊界，獨立出來才能精確控制 transaction 範圍
- Booking 有獨立生命週期，若併入 TimeSlot 會讓 TimeSlot 文件隨時間累積無界的子集合（Firestore 文件有大小上限，且違反「小 aggregate」原則）

替代方案（已否決）：TimeSlot 作為 Service 的 subcollection——否決原因：Firestore subcollection 查詢（collection group query）在既有專案中沒有先例，且不影響容量交易設計，徒增複雜度。

### D2. 容量併發控制：同一 Firestore transaction 內完成計數檢查與寫入

建立 Booking 時，在單一 `runTransaction` 內：讀取 `booking_time_slots/{id}` 的 `confirmedCount`/`pendingCount` → 驗證未達 `capacity` → 寫入新 `bookings` 文件 → 依 approvalMode 遞增 `confirmedCount` 或 `pendingCount`。取消/拒絕時的計數釋放，同樣須在 transaction 內完成（讀取現況、寫入狀態、遞減對應計數）。

理由：Firestore transaction 原生支援跨 collection 的原子讀寫，不需要額外的鎖表機制或分散式鎖。

風險：高併發下同一時段的 transaction 會重試（Firestore 樂觀鎖），需注意 API 回應時間；本次分析的 NFR-001 未給出具體效能數字，若上線後發現熱門時段有明顯延遲，需再評估（例如分散計數、或降低單一時段容量粒度）。

### D3. `booking` feature flag 比照既有模式，不另立機制

在 `packages/shared/feature-flags.ts` 的 `FeatureFlag` 物件新增 `Booking: 'booking'`，環境變數 `FEATURE_BOOKING_ENABLED`（預設 `true`，比照既有慣例）。所有 admin/liff/internal 路由開頭比照 `apps/server/server/api/admin/logs/audit.get.ts` 的模式：

```ts
if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
  throw createError({ statusCode: 404, message: 'Feature disabled' });
}
```

後台導覽項目隱藏、LIFF 頁面直連導向，比照既有 `useFeatureFlags()` composable 用法。

### D4. LINE 通知：定義模組內部介面，不在本次設計整合細節本身

預約建立/審核/取消**不再要求**會員為 LINE 好友（會員只要以 LIFF 登入即可預約），LINE 整合因此退化為單純的「狀態變化通知」加值功能，與核心預約流程解耦。Booking service 對外只依賴一個尚待建置的能力，以介面形式聲明（實作留給後續，若專案已有或即將有共用的 LINE Messaging API 整合層，booking 模組應改為依賴該共用層，而非自建）：

```ts
// 概念介面，非最終程式碼
interface LineNotifier {
  notify(userId: string, event: BookingNotificationEvent): Promise<void>;
}
```

`notify` 失敗時**只記錄，不阻斷**建立/審核/取消流程（NFR-002）；會員若非 LINE 好友，`notify` 預期會失敗，視同一般通知失敗處理，不特別區分原因。

待確認項：channel 憑證管理方式、通知內容/時機規則，見下方 Open Questions（好友狀態追蹤機制因需求變更已不再需要）。

### D5. Provider 為獨立管理實體，具 roster 狀態、每週出勤時段與服務項目指派；可選人員清單依時段篩選

`booking_providers` collection 為獨立 top-level collection，欄位包含 `id`/`name`/`enabled`（roster 上下架，預設 `true`，未設定視為 `true`）/`workingHours`（`{ weekdays, dailyStartTime, dailyEndTime }`，形狀比照 `BookingSlotTemplate` 的每週規律欄位）/`serviceIds`（可服務的服務項目 id 清單，多對多）。`bookings.providerId` 為選填欄位。

因應需求變更（見 D10），LIFF 預約流程新增「選擇服務人員」步驟，`GET /api/liff/booking/providers` 支援選填的 `timeSlotId` 查詢參數：

- 未帶 `timeSlotId`：回傳所有 `enabled !== false` 的人員（未過濾服務項目/出勤時段）
- 帶 `timeSlotId`：進一步過濾為「可指派到該時段」的人員——`enabled` 不為 `false`、`serviceIds` 包含該時段所屬服務項目、且 `workingHours` 已設定並涵蓋該時段的星期與時間區間（`workingHours` 或 `serviceIds` 未設定視為「對任何服務/時段皆不可預約」，須管理員明確設定後才可指派）

同樣的可指派規則（`enabled` + `serviceIds` + `workingHours`）在 `createBooking` 建立預約時也會再次驗證：若請求指定的 `providerId` 對該時段不可指派，系統拒絕建立並回傳衝突錯誤（`booking-provider-not-available` → 409），而非只在查詢端點過濾，避免會員繞過清單過濾直接帶入不合法的 `providerId`。

Admin 端提供完整 Provider 管理頁（`/admin/booking/providers`）：建立、編輯（含 roster 上下架、出勤時段、服務項目指派），對應 `GET`/`POST /api/admin/booking/providers`、`PATCH /api/admin/booking/providers/[id]`。

（本節取代原設計「Provider 維持全域最小 Entity、清單不依服務項目篩選」的決策——原設計刻意排除的「依服務項目限制可選人員範圍」在實作階段確認為必要需求，改為在本次範圍內完整落地，而非留待未來擴充。）

### D6a. 時段樣板改為「每週星期幾」樣式，不儲存具體日期

`BookingSlotTemplate` 由「日期陣列（`dates: string[]`）」改為「星期幾集合（`weekdays: number[]`，`0`=日～`6`=六，至少一項）」，其餘欄位（`dailyStartTime`/`dailyEndTime`/`granularityMinutes`/`defaultCapacity`）不變。範本本身不含任何具體日期；套用時才依「目標月份 × weekdays 命中規則」展開為當月具體時段（沿用既有 `bulkCreateTimeSlots` 依 `(startAt, endAt)` 去重機制，套用端點介面本身不需變更）。

理由：使用者明確反饋範本應描述「一週七天的營業規律」而非一次性日期清單，才能重複套用到不同月份而不需重建範本（例如固定每週一三五營業，但每個月實際日期不同）；原設計（`dates: string[]`）每次套用僅能對應固定那批日期，不符合實際使用情境。

影響：

- `packages/shared/dto/booking.ts`：`BookingSlotTemplate.dates`／`CreateBookingSlotTemplateRequest.dates` → `weekdays`
- `booking.schema.ts` 驗證規則由「日期字串陣列非空」改為「weekdays 為 `0`–`6` 的整數子集合、至少一項」
- Admin `BusinessDaysCalendarPicker.vue`（月曆多選日期元件）不再適用於樣板表單，改為「星期幾複選」元件（一週僅 7 個 chip/checkbox）
- `booking-slot-generation.ts` 的展開演算法輸入由「具體日期陣列」改為「目標月份 + weekdays」，內部「一天 × 粒度切分」的核心邏輯不變

### D6b. 時段管理頁改為「月曆檢視 + 套用即草稿 + 明確送出」，取消「新增時段」按鈕

時段管理頁（`/admin/booking/services/[id]/slots`）改版為：

- 一次呈現一個月份，上方提供「上個月／下個月」切換
- 點擊「套用樣板」：依 D6a 展開規則，將**目前檢視月份**的每一天以樣板規則覆蓋為草稿時段（純前端狀態，尚未呼叫任何 API）
- 移除「新增時段」按鈕；使用者直接點擊月曆上的某一天，開啟當日時段/容量編輯（新增、刪除、調整當天個別時段），變更同樣先落在前端草稿
- 草稿變更皆需使用者按下「設定完成」才實際呼叫 API：新增的時段走既有 `POST .../slots/bulk`、有異動的走既有 `PATCH .../slots/[slotId]`、被移除的走 `DELETE .../slots/[slotId]`——刪除單一時段原本沒有對應端點，屬本次實作時發現的缺口，已比照既有慣例補上（拒絕刪除已有預約的時段，回傳 409，見 tasks.md 11.10）

理由：使用者希望套用樣板與逐日微調能在同一個「所見即所得」畫面完成，且避免每次操作都觸發 API 呼叫造成中途狀態不一致；沿用既有 bulk 端點的 dedupe 機制作為「送出即最終結果」的安全網。

風險：若使用者切換月份或離開頁面卻未送出草稿，草稿會遺失——比照一般表單「離開前未儲存」慣例處理（例如 leave-confirm 提示），非本次資料層變更範圍。

### D6c. 服務項目建立時可選「套用樣板」，建立後導向時段管理頁並帶入當月草稿

建立服務項目的表單新增一個選項：「套用時段樣板」（可選填某個既有樣板）或「稍後設定」。若選擇套用樣板，服務項目建立成功後，系統導向該服務項目的時段管理頁（D6b 的月曆頁面），並已依樣板規則將當月展開為草稿——使用者仍須點擊「設定完成」才會實際呼叫 API 寫入時段（與 D6b 的一般套用行為一致，不另開「建立即自動寫入時段」的例外路徑）。若選擇「稍後設定」，建立後不進行任何時段展開，維持原有列表停留行為。

### D10. LIFF 預約流程改為四步驟：服務 → 日期(月曆)+時段(chip) → 人員(選填) → 確認頁

原設計（實作於 `apps/liff/src/pages/booking/[serviceId].vue`）選擇時段後點擊即直接送出預約，無確認頁、無人員選擇、時段以扁平列表呈現（不分日期）。改為：

1. 選擇服務項目
2. 月曆挑選日期 → 該日可預約時段以 chip 呈現（依服務項目時段的實際切分粒度，例如「11:30」）
3. 選擇服務人員（選填，來自 D5 依所選時段篩選後的可指派人員清單）
4. 確認頁：彙總顯示服務項目/日期時間/人員（未選則顯示「不指定」），使用者按下確認才呼叫 `POST /api/liff/booking/bookings`

資料面不需新增端點支援「日期分組」：既有 `GET /api/liff/booking/services/[id]/slots` 已回傳該服務所有時段（含 `startAt`），前端依 `startAt` 的日期分組後在月曆上標示「有時段的日期」，選中日期後再過濾當天時段；分組邏輯留在前端（單一服務項目的時段數量可控，不需伺服器端分頁/分組）。新增端點：`GET /api/liff/booking/providers`（D5）。

理由：使用者明確要求四步驟流程與月曆+chip 呈現方式；沿用既有時段查詢端點，避免新增後端分組邏輯。

### D11. LIFF 首頁新增「預約」摘要卡片，取代服務列表頁內的「我的預約」進入點

`apps/liff/src/pages/booking/index.vue`（服務項目列表頁）移除原本連到 `myBookings` 的圖示按鈕。改於 LIFF 首頁（`pages/home/index.vue`）新增 `BookingSummaryCard.vue`，比照既有 `CouponSummaryCard.vue`/`PointsSummaryCard.vue` 的摘要卡片慣例：載入會員的預約清單，找出時間最接近且尚未開始的一筆（`status` 為 `confirmed` 或 `pendingReview`、對應時段 `startAt` 晚於目前時間），顯示其服務名稱與日期時段；若無任何即將到來的預約則不顯示卡片（`emit('visible', ...)` 比照 `CouponSummaryCard.vue`）。點擊卡片導向既有 `myBookings` 頁面查看細節（不新增頁面，沿用既有取消/狀態顯示邏輯）。

理由：既有 `HomeShortcuts.vue` 的「預約」捷徑是進入服務項目列表（建立新預約用途），與「查看/管理既有預約」是不同操作意圖；比照點數/優惠券摘要卡片的既有 UI 慣例分開呈現，讓會員在首頁就能直接看到最近一筆預約狀態，不需先進入服務列表才找得到查詢入口。

### D6. 逾期未審核預約：先實作事件偵測，處理規則留待確認

新增 `POST /api/internal/booking/process-overdue-bookings`（比照既有 `POST /api/internal/level/evaluate-due-periods` + `requireLevelBatchSecret` 的共享密鑰模式），排程掃描超過 `reviewDeadlineAt` 仍為 `pendingReview` 的預約。**具體處理動作（自動取消 vs 僅提醒後台）留待 Open Questions 確認後再實作**，本次先把觸發機制與資料欄位（`bookings.reviewDeadlineAt`）就位。

## Risks / Trade-offs

- **[Risk] LINE Messaging API channel 憑證/整合方式未定案，可能導致通知功能延遲上線** → Mitigation：D4 已將通知隔離為 `LineNotifier` 介面，且預約建立/審核/取消已不再依賴好友狀態，booking 模組核心流程可完全獨立於 LINE 整合先行開發、測試、甚至上線，通知功能可用介面替換方式延後整合，完全不阻塞主要功能
- **[Risk] 高併發搶同一時段可能造成 transaction 重試延遲** → Mitigation：先以既有 Firestore transaction 機制實作，上線後依實際流量監控，必要時再優化（D2）
- **[Risk] Provider/取消時限/逾期規則三項待確認，若實作後才發現規則不同，需要改資料欄位** → Mitigation：D5/D6 已設計成可回退（deprecate 而非重構），`cancellableUntil`/`reviewDeadlineAt` 為可選欄位，不影響既有資料
- **[Risk] 時段管理頁改為「草稿 + 明確送出」後，使用者切換月份或離開頁面可能遺失未送出的草稿** → Mitigation：D6b 比照一般表單慣例加上離開前未儲存提示，屬前端 UX 細節，不影響資料層設計

## Migration Plan

- 新功能，無既有資料遷移需求
- 部署順序建議：先部署 `booking` flag 預設為 `false` 的版本（新程式碼與新 collection 建立但不對外開放）→ 確認後台服務項目/時段管理可用 → 確認 LINE 整合就緒後再開啟 flag 讓會員可見
- Rollback：關閉 `FEATURE_BOOKING_ENABLED` 即可完全隱藏模組，無需回滾資料

## Open Questions

以下項目延續自 `openspec/analysis/traceability.yaml` 的待確認清單，建議在 `tasks.md` 執行對應任務前逐一確認：

1. **LINE Messaging API channel 憑證管理方式與通知內容/時機規則** — 影響 D4、FR-011；不再阻塞預約建立本身，僅影響通知功能何時可上線
2. ~~Provider 是否需要獨立管理實體（roster/聯絡資訊）~~ — 已於實作階段確認並落地，見 D5（roster 上下架、每週出勤時段、服務項目指派）
3. **會員取消預約的時間窗限制規則**（`cancellableUntil` 的計算公式）
4. **逾期未審核預約的門檻與處理規則**（自動取消 vs 提醒後台）
5. **LINE 通知失敗的重試/補償策略**（NFR-002 未量化）
