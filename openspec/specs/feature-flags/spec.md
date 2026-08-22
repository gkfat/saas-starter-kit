## Purpose

Global, build-time module on/off switches (`auditLog`, `loginLog`, `points`) controlled by environment variables, shared consistently between server and client via `runtimeConfig.public`.

## Requirements

### Requirement: System defines independent feature flags for auditLog and loginLog modules

The system SHALL define two independent feature flags, `auditLog` and `loginLog`, controlled by environment variables (`FEATURE_AUDIT_LOG_ENABLED`, `FEATURE_LOGIN_LOG_ENABLED`). Each flag SHALL default to enabled (`true`) when its environment variable is not set. The two flags SHALL be settable independently of one another.

#### Scenario: Flags default to enabled

- **WHEN** neither `FEATURE_AUDIT_LOG_ENABLED` nor `FEATURE_LOGIN_LOG_ENABLED` is set in the environment
- **THEN** both `auditLog` and `loginLog` modules behave as fully enabled

#### Scenario: One flag disabled does not affect the other

- **WHEN** `FEATURE_AUDIT_LOG_ENABLED=false` is set and `FEATURE_LOGIN_LOG_ENABLED` is unset (or `true`)
- **THEN** the `auditLog` module is disabled while the `loginLog` module continues to operate normally

### Requirement: Disabling a module does not break other application functionality

The system SHALL treat log-writing calls for a disabled module as no-ops that do not raise errors, so that operations which trigger those writes (e.g. assigning a user role, permission changes, login) complete successfully regardless of the flag's state.

#### Scenario: Assigning a user role succeeds with auditLog disabled

- **WHEN** `auditLog` is disabled and an admin changes a user's role via `PATCH /api/admin/users/:id`
- **THEN** the role assignment succeeds and no audit log entry is written, and the request does not fail or error because of the disabled flag

#### Scenario: Login succeeds with loginLog disabled

- **WHEN** `loginLog` is disabled and a user logs in
- **THEN** the login completes successfully and no login log entry is written, and the login flow does not fail or error because of the disabled flag

### Requirement: Disabled module's read API rejects requests regardless of permission

The system SHALL make the read endpoints for a disabled module (`GET /api/admin/logs/audit` for `auditLog`, `GET /api/admin/logs/login` for `loginLog`) reject all requests with a "feature disabled" error, even when the caller holds the corresponding read permission (`audit_logs:read`, `login_logs:read`).

#### Scenario: Audit log API rejected when auditLog disabled

- **WHEN** `auditLog` is disabled and a user with `audit_logs:read` permission calls `GET /api/admin/logs/audit`
- **THEN** the server responds with an error indicating the feature is disabled, not the list of audit logs

#### Scenario: Login log API rejected when loginLog disabled

- **WHEN** `loginLog` is disabled and a user with `login_logs:read` permission calls `GET /api/admin/logs/login`
- **THEN** the server responds with an error indicating the feature is disabled, not the list of login logs

### Requirement: Disabled module's navigation and page are inaccessible on the frontend

The system SHALL hide the navigation item for a disabled module from the sidebar and SHALL redirect any direct navigation to its page away (to `/dashboard`), independent of the user's permissions.

#### Scenario: Audit logs nav item hidden when auditLog disabled

- **WHEN** `auditLog` is disabled
- **THEN** the "稽核紀錄" navigation item does not appear in the sidebar for any user, including users who hold `audit_logs:read`

#### Scenario: Direct navigation to a disabled module's page is blocked

- **WHEN** `loginLog` is disabled and a logged-in user navigates directly to `/admin/logs/login` via URL
- **THEN** the client route guard redirects the user to `/dashboard` without rendering the page

### Requirement: Feature flag configuration is shared consistently between server and client

The system SHALL expose the same feature flag values to both server-side request handling and client-side rendering from a single configuration source, so that a flag's enabled/disabled state cannot differ between the two.

#### Scenario: Flag value consistent across server and client

- **WHEN** `FEATURE_AUDIT_LOG_ENABLED=false` is set for a deployment
- **THEN** both the server API rejection behavior and the client navigation/page-hiding behavior reflect `auditLog` as disabled

### Requirement: System defines an independent feature flag for the points module

The system SHALL define a `points` feature flag, controlled by the environment variable `FEATURE_POINTS_ENABLED`. The flag SHALL default to enabled (`true`) when the environment variable is not set, and SHALL be settable independently of the `auditLog` and `loginLog` flags.

#### Scenario: Points flag defaults to enabled

- **WHEN** `FEATURE_POINTS_ENABLED` is not set in the environment
- **THEN** the `points` module behaves as fully enabled

#### Scenario: Points flag disabled does not affect other flags

- **WHEN** `FEATURE_POINTS_ENABLED=false` is set
- **THEN** the `points` module is disabled while `auditLog` and `loginLog` continue to operate according to their own settings

### Requirement: Disabled points module's read and write APIs reject requests

The system SHALL make all `points` module API routes (settings, member balance, ledger, adjustment) reject requests with a "feature disabled" error when the `points` flag is disabled, regardless of the caller's permissions.

#### Scenario: Points adjustment API rejected when disabled

- **WHEN** `points` is disabled and an admin with points-adjustment permission calls the point adjustment API
- **THEN** the server responds with an error indicating the feature is disabled, and no balance or ledger change occurs

#### Scenario: LIFF point balance API rejected when disabled

- **WHEN** `points` is disabled and a member's LIFF client requests their point balance
- **THEN** the server responds with an error indicating the feature is disabled

### Requirement: Disabled points module's navigation and pages are inaccessible on the frontend

The system SHALL hide the points-related navigation items (admin sidebar entry, LIFF member-center entry link) when the `points` flag is disabled, and SHALL redirect direct navigation to points-related pages away from those pages, independent of the user's permissions.

#### Scenario: Admin points nav item hidden when disabled

- **WHEN** `points` is disabled
- **THEN** the points management navigation item does not appear in the admin sidebar for any user

#### Scenario: Direct navigation to a disabled points page is blocked

- **WHEN** `points` is disabled and a user navigates directly to an admin points page or the LIFF point history page via URL
- **THEN** the system redirects away from that page

#### Scenario: Member card and QR page hide point information when disabled

- **WHEN** `points` is disabled
- **THEN** the member card does not display point balance, and the member QR code page does not display point balance or redeemable amount

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
