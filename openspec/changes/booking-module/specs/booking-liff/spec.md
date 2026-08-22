## ADDED Requirements

### Requirement: Member can browse enabled service items and their time slots

系統 SHALL 允許已登入的 LIFF 會員瀏覽所有 `enabled` 為 `true` 的服務項目，以及所選服務項目下的可預約時段與各時段的剩餘容量（`capacity - confirmedCount - pendingCount`）。

#### Scenario: 瀏覽已啟用服務項目清單

- **WHEN** 已登入會員請求服務項目清單
- **THEN** 系統回傳所有 `enabled` 為 `true` 的服務項目，不包含已停用項目

#### Scenario: 瀏覽服務項目的時段與剩餘容量

- **WHEN** 已登入會員請求某服務項目的時段清單
- **THEN** 系統回傳該服務項目的所有時段，每筆時段包含起訖時間與剩餘容量

### Requirement: Member can browse time slots grouped by date with chip-style selection

系統 SHALL 提供足以讓 LIFF 端以月曆呈現「該月哪些日期有可預約時段」的時段資料（依既有時段清單的 `startAt` 分組），並在會員選定日期後，僅呈現該日期的可預約時段，以時段起始時間（例如「11:30」）為標籤逐一列出供選擇。

#### Scenario: 月曆標示有時段的日期

- **WHEN** 已登入會員瀏覽某服務項目於指定月份的時段
- **THEN** 該月份中至少有一筆可預約時段的日期會被標示出來

#### Scenario: 選定日期後僅呈現當天時段

- **WHEN** 會員在月曆上選擇某一天
- **THEN** 系統僅呈現 `startAt` 所屬日期等於所選日期的時段，每筆以時段起始時間為標籤

### Requirement: Member can optionally select a provider when creating a booking

系統 SHALL 允許會員在建立預約時，從「可指派至所選時段」的服務人員清單中選填一位人員（`providerId`），亦可不指定。可指派人員 SHALL 限定為：roster 狀態為啟用、已指派至該時段所屬服務項目、且每週出勤時段涵蓋該時段星期與時間的人員。

#### Scenario: 瀏覽可選人員清單

- **WHEN** 會員在選定日期時段後進入人員選擇步驟
- **THEN** 系統僅回傳可指派至該時段的服務人員清單（roster 啟用、已指派該服務項目、出勤時段涵蓋該時段），不包含其餘人員

#### Scenario: 指定人員建立預約

- **WHEN** 會員建立預約時選擇了一位可指派至該時段的服務人員
- **THEN** 系統建立的預約 `providerId` 為所選人員

#### Scenario: 不指定人員建立預約

- **WHEN** 會員建立預約時未選擇服務人員
- **THEN** 系統建立的預約 `providerId` 為空，不影響其餘建立邏輯

#### Scenario: 指定不可指派至該時段的人員建立預約被拒絕

- **WHEN** 會員建立預約時指定的 `providerId` 對該時段不可指派（roster 未啟用、未指派該服務項目、或出勤時段未涵蓋該時段）
- **THEN** 系統拒絕此次建立請求，回傳衝突錯誤，不建立預約

### Requirement: Member confirms booking details before submission

系統 SHALL 在會員完成服務項目、日期時段、人員（選填）三項選擇後，於確認頁彙總顯示上述選擇，待會員於確認頁送出後才實際建立預約；確認前變更任一項選擇 SHALL NOT 觸發建立預約。

#### Scenario: 確認頁送出後才建立預約

- **WHEN** 會員在確認頁按下送出
- **THEN** 系統才呼叫建立預約，並套用既有的容量檢查與 `approvalMode` 規則

#### Scenario: 返回修改選擇不建立預約

- **WHEN** 會員在確認頁返回修改任一項選擇（服務項目、日期時段或人員）
- **THEN** 系統不建立任何預約紀錄

### Requirement: Member can create a booking within an available time slot

系統 SHALL 允許已登入會員針對容量未滿的時段建立預約，並可選填 `providerId` 指定人員。建立時 SHALL 依所屬服務項目的 `approvalMode` 決定初始狀態：`auto` → `confirmed`；`manual` → `pendingReview`。系統 SHALL 在同一次交易內驗證並更新該時段的容量計數，確保併發建立不會超過 `capacity`。

#### Scenario: 容量內建立預約，自動確認模式

- **WHEN** 會員對一個 `approvalMode` 為 `auto` 且尚有剩餘容量的時段建立預約
- **THEN** 系統建立狀態為 `confirmed` 的預約，並將該時段 `confirmedCount` 加一

#### Scenario: 容量內建立預約，人工審核模式

- **WHEN** 會員對一個 `approvalMode` 為 `manual` 且尚有剩餘容量的時段建立預約
- **THEN** 系統建立狀態為 `pendingReview` 的預約，並將該時段 `pendingCount` 加一

#### Scenario: 容量已滿時建立預約被拒絕

- **WHEN** 會員對一個 `confirmedCount + pendingCount` 已達 `capacity` 的時段建立預約
- **THEN** 系統拒絕此次請求，不建立預約，且不變更該時段的計數

#### Scenario: 併發建立僅一方成功

- **WHEN** 兩個會員請求同時對剩餘容量僅 1 的同一時段建立預約
- **THEN** 系統僅允許其中一個請求成功建立預約，另一個請求依「容量已滿」情境被拒絕

### Requirement: LIFF home page shows a summary of the member's next upcoming booking

系統 SHALL 在 LIFF 首頁顯示會員最近一筆尚未開始、狀態為 `confirmed` 或 `pendingReview` 的預約摘要（服務名稱與日期時段），若無符合條件的預約則不顯示該摘要。點擊摘要 SHALL 導向會員的預約列表頁面查看細節。

#### Scenario: 有即將到來的預約時顯示摘要

- **WHEN** 會員有至少一筆狀態為 `confirmed` 或 `pendingReview`、對應時段尚未開始的預約
- **THEN** 首頁顯示其中最接近的一筆預約的服務名稱與日期時段

#### Scenario: 無即將到來的預約時不顯示摘要

- **WHEN** 會員沒有任何狀態為 `confirmed` 或 `pendingReview`、且對應時段尚未開始的預約
- **THEN** 首頁不顯示預約摘要卡片

#### Scenario: 點擊摘要進入預約列表頁

- **WHEN** 會員點擊首頁的預約摘要卡片
- **THEN** 系統導向會員的預約列表頁面，可查看該筆預約的完整細節與其他預約

### Requirement: Member can view their own bookings

系統 SHALL 允許已登入會員查看自己建立的所有預約及其目前狀態。

#### Scenario: 查看自己的預約列表

- **WHEN** 已登入會員請求自己的預約列表
- **THEN** 系統僅回傳該會員自己建立的預約，不包含其他會員的預約

### Requirement: Member can cancel their own booking before it starts

系統 SHALL 允許會員取消自己建立、且對應時段尚未開始（目前時間早於時段 `startAt`）的預約，取消後 SHALL 將該預約狀態更新為 `cancelled`，並將該時段對應的計數（`confirmedCount` 或 `pendingCount`，依取消前狀態）減一。

#### Scenario: 取消尚未開始的預約成功

- **WHEN** 會員對自己一筆狀態為 `confirmed` 或 `pendingReview`、且對應時段 `startAt` 晚於目前時間的預約送出取消請求
- **THEN** 系統將該預約狀態更新為 `cancelled`，並將對應時段的計數減一

#### Scenario: 取消他人的預約被拒絕

- **WHEN** 會員嘗試取消不屬於自己的預約
- **THEN** 系統拒絕此次請求，不變更該預約狀態

#### Scenario: 取消已開始的預約被拒絕

- **WHEN** 會員對一筆對應時段 `startAt` 已早於或等於目前時間的預約送出取消請求
- **THEN** 系統拒絕此次請求，不變更該預約狀態
