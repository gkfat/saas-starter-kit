# Coupon Management Spec

## Purpose

Provides admin-facing coupon template management: creating and editing coupon templates, managing their `draft`/`published`/`disabled` lifecycle, batch-issuing coupons to members, and viewing issuance records.

## Requirements

### Requirement: 管理員可建立與編輯優惠券範本

系統 SHALL 允許擁有 `coupons:write` 權限的管理員建立與編輯優惠券範本，範本包含 `title`、`description`、`discountType`（`fixed`/`percentage`/`item`）、`discountValue`（`fixed`/`percentage` 類型必填）、`validDays`、`status`（`draft`/`published`/`disabled`）。

#### Scenario: 建立草稿範本

- **WHEN** 管理員送出新範本表單且未指定 `status`
- **THEN** 系統以 `status: 'draft'` 建立範本，並寫入一筆 `audit_logs`

#### Scenario: 缺少必要折扣值

- **WHEN** 管理員建立 `discountType: 'fixed'` 或 `'percentage'` 的範本但未填 `discountValue`
- **THEN** 系統回傳驗證錯誤，不建立範本

#### Scenario: 無權限使用者建立範本

- **WHEN** 使用者不具備 `coupons:write` 權限呼叫建立範本 API
- **THEN** 系統回傳 403 並拒絕操作

### Requirement: 範本狀態生命週期管理

系統 SHALL 支援範本狀態在 `draft`、`published`、`disabled` 之間轉換，且僅 `published` 狀態的範本可執行發放。

#### Scenario: 發行草稿範本

- **WHEN** 管理員將 `draft` 範本狀態切換為 `published`
- **THEN** 系統更新範本狀態並寫入一筆 `audit_logs`

#### Scenario: 停用範本後既有券不受影響

- **WHEN** 管理員將 `published` 範本狀態切換為 `disabled`
- **THEN** 該範本已發出的 `coupon_instances` 保持原本核銷/到期狀態不變，僅該範本無法再被發放

#### Scenario: 對草稿範本發放

- **WHEN** 管理員嘗試對 `status` 為 `draft` 或 `disabled` 的範本執行發放
- **THEN** 系統回傳錯誤，拒絕發放

### Requirement: 管理員可批次發放優惠券給指定會員

系統 SHALL 允許擁有 `coupons:issue` 權限的管理員針對 `published` 範本，選擇一位或多位會員批次發放，每次發放為每位選定會員各自建立一筆獨立的 `coupon_instances` 紀錄。

#### Scenario: 發放給多位會員

- **WHEN** 管理員對某 `published` 範本勾選 3 位會員並送出發放
- **THEN** 系統建立 3 筆獨立的 `coupon_instances`，各自帶有唯一 `code`、`issuedAt`、`issuedBy`、`expiresAt`（= 發放當下時間 + 範本 `validDays`），並寫入一筆 `audit_logs`

#### Scenario: 對同一會員重複發放同一範本

- **WHEN** 管理員對已持有某範本優惠券的會員再次發放同範本
- **THEN** 系統允許操作，建立另一筆獨立的 `coupon_instances`，不因既有持有紀錄而拒絕

#### Scenario: 無權限使用者執行發放

- **WHEN** 使用者不具備 `coupons:issue` 權限呼叫發放 API
- **THEN** 系統回傳 403 並拒絕操作

### Requirement: 管理員可查看範本的發放紀錄

系統 SHALL 允許擁有 `coupons:read` 權限的管理員查看指定範本的所有已發放 `coupon_instances`，包含發放對象、發放時間、核銷狀態。

#### Scenario: 查看發放紀錄列表

- **WHEN** 管理員查詢某範本的發放紀錄
- **THEN** 系統回傳該範本所有 `coupon_instances`，並依 `redeemedAt`/`expiresAt` 標示各筆為可使用/已使用/已過期
