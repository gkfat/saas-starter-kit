## REMOVED Requirements

### Requirement: `users:create` permission gates admin-created user accounts

**Reason**: 「使用者」管理頁拆分為「會員管理」與「後台帳號管理」兩個獨立頁面後，建立使用者的權限也拆為 `members:create` 與 `admin-accounts:create` 兩組，不再有單一的 `users:create`。
**Migration**: 原本依賴 `users:create` 的授權，改為依頁面使用 `members:create`（建立會員）或 `admin-accounts:create`（建立後台帳號），見下方 ADDED Requirements。

#### Scenario: Admin has `users:create` permission

- **WHEN** a user with role `admin` opens the user management page
- **THEN** the "建立使用者" action is visible and `POST /api/admin/users` succeeds when invoked

#### Scenario: Member lacks `users:create` permission

- **WHEN** a user with role `member` calls `POST /api/admin/users`
- **THEN** the server rejects the request with a permission error and does not create a user

#### Scenario: Superadmin always permitted

- **WHEN** a superadmin (Firebase custom claim `role: 'superadmin'`) calls `POST /api/admin/users`
- **THEN** the request succeeds regardless of Firestore role_permissions data

### Requirement: `users:delete` permission gates deleting a user account

**Reason**: 「使用者」管理頁拆分為「會員管理」與「後台帳號管理」兩個獨立頁面後，刪除使用者的權限也拆為 `members:delete` 與 `admin-accounts:delete` 兩組，不再有單一的 `users:delete`。
**Migration**: 原本依賴 `users:delete` 的授權，改為依頁面使用 `members:delete`（刪除會員）或 `admin-accounts:delete`（刪除後台帳號），見下方 ADDED Requirements。

#### Scenario: Admin has `users:delete` permission

- **WHEN** a user with role `admin` opens the user management page
- **THEN** the delete action is visible for disabled users and `DELETE /api/admin/users/:id` succeeds when invoked on a disabled user

#### Scenario: Member lacks `users:delete` permission

- **WHEN** a user with role `member` calls `DELETE /api/admin/users/:id`
- **THEN** the server rejects the request with a permission error and does not delete the user

#### Scenario: Superadmin always permitted

- **WHEN** a superadmin calls `DELETE /api/admin/users/:id` for a disabled user
- **THEN** the request succeeds regardless of Firestore role_permissions data

## ADDED Requirements

### Requirement: `members:*` permission set gates member management

The system SHALL introduce a permission set `members:read`, `members:write`, `members:create`, `members:delete` (format `resource:action`) that controls access to the member management page (`/admin/members`) and its operations: viewing/searching the member list, enabling/disabling a member, regenerating a password-setup link, deleting a disabled member, and creating a new member. The `admin` role SHALL include all four `members:*` permissions in its default permission set. The `member` role SHALL NOT include any `members:*` permission. `superadmin` bypasses permission checks as with all other permissions.

#### Scenario: Admin has full `members:*` permission set

- **WHEN** a user with role `admin` navigates to `/admin/members`
- **THEN** the page renders, and all `members:*`-gated actions (create, disable/enable, regenerate link, delete) are available per their own scenarios

#### Scenario: Member lacks `members:*` permissions

- **WHEN** a user with role `member` calls `GET /api/admin/users?role=member`
- **THEN** the server rejects the request with a permission error

#### Scenario: Superadmin always permitted

- **WHEN** a superadmin calls any `members:*`-gated endpoint
- **THEN** the request succeeds regardless of Firestore role_permissions data

### Requirement: `admin-accounts:*` permission set gates admin account management

The system SHALL introduce a permission set `admin-accounts:read`, `admin-accounts:write`, `admin-accounts:create`, `admin-accounts:delete` (format `resource:action`) that controls access to the admin account management page (`/admin/admin-accounts`) and its operations: viewing/searching the admin account list, enabling/disabling an admin account, regenerating a password-setup link, deleting a disabled admin account, and creating a new admin account. The `admin` role SHALL include all four `admin-accounts:*` permissions in its default permission set. The `member` role SHALL NOT include any `admin-accounts:*` permission. `superadmin` bypasses permission checks as with all other permissions.

#### Scenario: Admin has full `admin-accounts:*` permission set

- **WHEN** a user with role `admin` navigates to `/admin/admin-accounts`
- **THEN** the page renders, and all `admin-accounts:*`-gated actions (create, disable/enable, regenerate link, delete) are available per their own scenarios

#### Scenario: Member lacks `admin-accounts:*` permissions

- **WHEN** a user with role `member` calls `GET /api/admin/users?role=non-member`
- **THEN** the server rejects the request with a permission error

#### Scenario: Superadmin always permitted

- **WHEN** a superadmin calls any `admin-accounts:*`-gated endpoint
- **THEN** the request succeeds regardless of Firestore role_permissions data
