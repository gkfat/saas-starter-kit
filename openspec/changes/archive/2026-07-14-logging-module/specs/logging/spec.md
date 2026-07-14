## MODIFIED Requirements

### Requirement: AuditLog type definition

`AuditLog` 的 `diff` 欄位 SHALL 為 optional（`diff?`），前端 SHALL 對 `undefined` 顯示佔位符，不強制要求呼叫端提供 before/after。

#### Scenario: diff 欄位缺席時仍可寫入

- **WHEN** `recordAuditLog` 收到不含 `diff` 的 AuditLog 資料
- **THEN** 系統 SHALL 成功寫入 Firestore，不拋出錯誤

## ADDED Requirements

### Requirement: audit_log 寫入點在 API handler 層

audit_log SHALL 在 API handler 操作成功後寫入，不在 service 層寫入。actor 資訊 SHALL 從 `event.context` 取得，不由呼叫端組裝傳入。

#### Scenario: actor 欄位來自 RequestContext

- **WHEN** API handler 呼叫 `recordAuditLog`
- **THEN** `actor.userId`、`actor.tenantId` SHALL 來自 `event.context`，`actor.role` 若為 undefined 則使用 `'unknown'`

### Requirement: 用戶角色變更寫入 audit_log

`PATCH /api/admin/users/:id`（指派角色）成功後，系統 SHALL 寫入 audit_log。

#### Scenario: 指派角色後記錄

- **WHEN** `assignUserRole` 執行成功
- **THEN** 系統 SHALL 寫入 audit_log，action: `user.role.assign`，metadata: `{ userId, role }`

### Requirement: 角色權限更新寫入 audit_log

`PATCH /api/admin/role-permissions`（更新角色權限）成功後，系統 SHALL 寫入 audit_log。

#### Scenario: 更新角色權限後記錄

- **WHEN** `updateRolePermissions` 執行成功
- **THEN** 系統 SHALL 寫入 audit_log，action: `role.permissions.update`，metadata: `{ roleName, permissions }`

### Requirement: audit_log 寫入失敗不中斷主操作

audit_log 寫入錯誤 SHALL NOT 影響 API handler 的 HTTP response。

#### Scenario: log 寫入失敗

- **WHEN** `recordAuditLog` 拋出錯誤
- **THEN** 系統 SHALL 仍回傳主操作的成功結果，並以 `console.error` 記錄錯誤
