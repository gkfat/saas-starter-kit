## Purpose

Admin-side review workflow for bookings: listing/filtering bookings, and approving or rejecting pending bookings.

## Requirements

### Requirement: Admin can list and filter bookings

系統 SHALL 允許具備權限的管理員查詢預約列表，並可依 `serviceId`、`timeSlotId`、`status`、`memberId`、`providerId` 任意組合篩選。

#### Scenario: 依狀態篩選預約列表

- **WHEN** 管理員以 `status=pendingReview` 查詢預約列表
- **THEN** 系統僅回傳狀態為 `pendingReview` 的預約

#### Scenario: 無篩選條件時回傳全部預約

- **WHEN** 管理員在未提供任何篩選條件的情況下查詢預約列表
- **THEN** 系統回傳所有預約

### Requirement: Admin can approve or reject a pending booking

系統 SHALL 允許具備權限的管理員對狀態為 `pendingReview` 的預約進行核准（轉為 `confirmed`）或拒絕（轉為 `rejected`）。核准 SHALL 將該時段 `pendingCount` 減一、`confirmedCount` 加一；拒絕 SHALL 將該時段 `pendingCount` 減一。

#### Scenario: 核准待審核預約

- **WHEN** 管理員對一筆狀態為 `pendingReview` 的預約送出核准
- **THEN** 系統將該預約狀態更新為 `confirmed`，對應時段的 `pendingCount` 減一、`confirmedCount` 加一

#### Scenario: 拒絕待審核預約

- **WHEN** 管理員對一筆狀態為 `pendingReview` 的預約送出拒絕
- **THEN** 系統將該預約狀態更新為 `rejected`，對應時段的 `pendingCount` 減一

#### Scenario: 對非待審核狀態的預約審核被拒絕

- **WHEN** 管理員對一筆狀態已非 `pendingReview`（例如已被會員取消）的預約送出核准或拒絕
- **THEN** 系統拒絕此次審核操作，不變更該預約狀態，並回傳衝突錯誤
