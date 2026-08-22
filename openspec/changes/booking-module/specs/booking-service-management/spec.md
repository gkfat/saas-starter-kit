## ADDED Requirements

### Requirement: Admin can create and edit service items

系統 SHALL 允許具備權限的管理員建立與編輯服務項目（Service），每個服務項目包含 `name`（必填）、`description`（選填）、`approvalMode`（`auto` 或 `manual`，必填）、`enabled`（布林，必填）。

#### Scenario: 建立服務項目成功

- **WHEN** 管理員提交 `name`、`approvalMode` 皆有效的建立請求
- **THEN** 系統建立新的服務項目，並回傳其 `id`

#### Scenario: 建立服務項目缺少必填欄位

- **WHEN** 管理員提交的建立請求缺少 `name` 或 `approvalMode`
- **THEN** 系統回傳驗證錯誤，不建立服務項目

#### Scenario: 編輯服務項目成功

- **WHEN** 管理員對已存在的服務項目提交有效的欄位更新
- **THEN** 系統更新該服務項目並回傳最新內容

### Requirement: Admin can disable a service item

系統 SHALL 允許管理員將服務項目的 `enabled` 設為 `false`，停用後該服務項目 SHALL NOT 出現在會員可預約清單中，但既有預約紀錄不受影響。

#### Scenario: 停用服務項目後不再出現在會員清單

- **WHEN** 管理員將一個服務項目的 `enabled` 設為 `false`
- **THEN** 該服務項目不再出現於 LIFF 端「已啟用服務項目」清單中，且該服務項目既有的預約紀錄狀態不變

### Requirement: Admin can create and edit time slots under a service item

系統 SHALL 允許管理員為服務項目建立時段（Time Slot），每個時段包含 `startAt`、`endAt`（皆為必填時間戳，`endAt` 必須晚於 `startAt`）、`capacity`（必填正整數）。系統 SHALL 允許管理員編輯既有時段的 `startAt`、`endAt`、`capacity`。

#### Scenario: 建立時段成功

- **WHEN** 管理員對一個服務項目提交 `endAt` 晚於 `startAt` 且 `capacity` 為正整數的時段建立請求
- **THEN** 系統建立該時段，初始 `confirmedCount` 與 `pendingCount` 皆為 0

#### Scenario: 建立時段時結束時間早於起始時間

- **WHEN** 管理員提交的時段 `endAt` 早於或等於 `startAt`
- **THEN** 系統回傳驗證錯誤，不建立該時段

#### Scenario: 編輯時段容量低於目前已使用量

- **WHEN** 管理員將時段 `capacity` 調降至低於目前 `confirmedCount + pendingCount` 的值
- **THEN** 系統拒絕此次更新並回傳衝突錯誤，不變更該時段

### Requirement: Admin can define a slot template based on a weekly recurring pattern

系統 SHALL 允許管理員建立時段樣板（Slot Template），內容包含 `weekdays`（一週中的星期幾集合，至少一項）、`dailyStartTime`/`dailyEndTime`（`HH:mm`，`dailyEndTime` 須晚於 `dailyStartTime`）、`granularityMinutes`（15/30/60 之一）、`defaultCapacity`（正整數）。樣板本身 SHALL NOT 綁定任何具體日期。

#### Scenario: 建立樣板成功

- **WHEN** 管理員提交至少一個 `weekday` 且 `dailyEndTime` 晚於 `dailyStartTime` 的樣板
- **THEN** 系統建立該樣板

#### Scenario: dailyEndTime 早於或等於 dailyStartTime

- **WHEN** 管理員提交的樣板 `dailyEndTime` 早於或等於 `dailyStartTime`
- **THEN** 系統回傳驗證錯誤，不建立該樣板

### Requirement: Admin can apply a slot template to a target month as a draft before saving

系統 SHALL 允許管理員在時段管理頁選擇某個樣板套用到目前檢視的月份；套用後系統 SHALL 僅產生前端草稿（依樣板 `weekdays` 規則展開該月份所有命中日期的時段），須管理員明確送出（「設定完成」）後才實際建立/更新時段資料。

#### Scenario: 套用樣板僅產生草稿

- **WHEN** 管理員在時段管理頁對某月份套用樣板
- **THEN** 系統依 `weekdays` 規則展開該月份對應日期的時段草稿，尚未呼叫任何建立時段的 API

#### Scenario: 送出草稿才持久化

- **WHEN** 管理員在套用樣板產生草稿後點擊「設定完成」
- **THEN** 系統才呼叫建立/更新時段的 API；重複套用同一批 `(startAt, endAt)` 時段會被去重略過

### Requirement: Admin can adjust a single day's slots directly from the monthly calendar

系統 SHALL 允許管理員在時段管理頁的月曆上點擊任一天，直接編輯該天的時段（新增、修改、刪除）與容量，不需透過獨立的「新增時段」入口。

#### Scenario: 點擊日期進入當日編輯

- **WHEN** 管理員點擊月曆上的某一天
- **THEN** 系統顯示該天既有時段供編輯，並允許新增或刪除當天時段

### Requirement: Admin can choose to apply a slot template or defer when creating a service item

系統 SHALL 在建立服務項目時提供選項：套用既有時段樣板，或稍後設定。選擇套用樣板時，服務項目建立成功後 SHALL 導向該服務項目的時段管理頁，並已將樣板套用至當月為草稿（仍需管理員送出才持久化）。

#### Scenario: 建立時套用樣板

- **WHEN** 管理員建立服務項目時選擇套用某個樣板
- **THEN** 系統建立服務項目後導向其時段管理頁，並已依樣板展開當月草稿

#### Scenario: 建立時選擇稍後設定

- **WHEN** 管理員建立服務項目時選擇稍後設定
- **THEN** 系統建立服務項目，不進行任何時段展開

### Requirement: Admin can manage service providers with roster status, working hours, and service assignment

系統 SHALL 允許具備權限的管理員建立與編輯服務人員（Provider），欄位包含 `name`（必填）、`enabled`（roster 上下架，選填，預設 `true`）、`workingHours`（每週出勤時段，選填，含 `weekdays`/`dailyStartTime`/`dailyEndTime`）、`serviceIds`（可服務的服務項目 id 清單，選填）。`workingHours` 或 `serviceIds` 未設定的人員 SHALL NOT 出現在任何時段的可指派人員清單中。

#### Scenario: 建立服務人員成功

- **WHEN** 管理員提交有效的 `name`
- **THEN** 系統建立新的服務人員，並回傳其 `id`

#### Scenario: 編輯服務人員的出勤時段與服務項目指派

- **WHEN** 管理員為既有服務人員設定 `workingHours` 與 `serviceIds`
- **THEN** 系統更新該服務人員，之後查詢對應服務項目、且時段落在出勤時段內的可指派人員清單時會包含此人員

#### Scenario: 下架服務人員後不再可被指派

- **WHEN** 管理員將某服務人員的 `enabled` 設為 `false`
- **THEN** 該服務人員不再出現於任何時段的可指派人員清單中，既有已指派該人員的預約紀錄不受影響

#### Scenario: 未設定出勤時段或服務項目的人員不可被指派

- **WHEN** 某服務人員的 `workingHours` 或 `serviceIds` 尚未設定
- **THEN** 該服務人員不會出現在任何時段的可指派人員清單中，直到管理員完成設定

### Requirement: Service list displays disabled state text and description column

系統 SHALL 在服務項目列表中，將 `enabled` 為 `false` 的項目顯示為「未啟用」，並顯示 `description` 欄位（無值時可留空）。

#### Scenario: 停用項目顯示為「未啟用」

- **WHEN** 服務項目的 `enabled` 為 `false`
- **THEN** 列表中該項目的啟用狀態顯示文字為「未啟用」

#### Scenario: 列表顯示說明欄位

- **WHEN** 管理員檢視服務項目列表
- **THEN** 每筆項目顯示其 `description` 內容（若未填寫則顯示為空）
