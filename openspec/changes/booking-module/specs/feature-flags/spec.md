## ADDED Requirements

### Requirement: System defines an independent feature flag for the booking module

系統 SHALL 定義一個 `booking` feature flag，由環境變數 `FEATURE_BOOKING_ENABLED` 控制。未設定該環境變數時，`booking` SHALL 預設為啟用（`true`），且 SHALL 可獨立於 `auditLog`、`loginLog`、`level`、`coupon`、`points`、`event` 等既有 flag 設定。

#### Scenario: Booking flag 預設為啟用

- **WHEN** 環境未設定 `FEATURE_BOOKING_ENABLED`
- **THEN** `booking` 模組行為視為完全啟用

#### Scenario: Booking flag 停用不影響其他 flag

- **WHEN** 設定 `FEATURE_BOOKING_ENABLED=false`
- **THEN** `booking` 模組被停用，其餘既有 flag（`auditLog`、`loginLog`、`level`、`coupon`、`points`、`event`）依各自設定繼續運作

### Requirement: Disabled booking module's APIs reject requests

系統 SHALL 使 `booking` 模組所有 API 路由（服務項目、時段、預約建立/查詢/審核/取消）在 `booking` flag 停用時，對所有請求回傳「功能已停用」錯誤，無論呼叫者權限為何。

#### Scenario: Booking API 在停用時被拒絕

- **WHEN** `booking` 為停用狀態，且一名具備對應權限的使用者呼叫任一 booking 模組 API
- **THEN** 伺服器回傳表示功能已停用的錯誤，而非該 API 原本的回應內容

### Requirement: Disabled booking module's navigation and pages are inaccessible on the frontend

系統 SHALL 在 `booking` flag 停用時，於後台導覽隱藏預約管理相關項目，並於 LIFF 端隱藏預約相關入口；直接以網址進入後台或 LIFF 的預約相關頁面 SHALL 被導離該頁面，無論使用者權限為何。

#### Scenario: Booking 停用時後台導覽項目隱藏

- **WHEN** `booking` 為停用狀態
- **THEN** 預約管理相關的導覽項目不出現在後台側邊欄，包含具備相關權限的使用者

#### Scenario: Booking 停用時直連頁面被導離

- **WHEN** `booking` 為停用狀態，且已登入使用者直接以網址進入後台或 LIFF 的預約相關頁面
- **THEN** 系統將使用者導離該頁面，不渲染預約相關內容
