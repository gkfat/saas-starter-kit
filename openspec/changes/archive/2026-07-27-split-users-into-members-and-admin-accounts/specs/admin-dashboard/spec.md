## REMOVED Requirements

### Requirement: User management page lists and filters users

**Reason**: 單一使用者管理頁面拆分為「會員管理」與「後台帳號管理」兩個獨立頁面，各自擁有獨立權限與固定的角色範圍，不再需要讓使用者手動切換 role 篩選。
**Migration**: 原本 `/admin/users` 的功能由 `/admin/members`（角色範圍固定為 member）與 `/admin/admin-accounts`（角色範圍固定為非 member）取代，見下方 ADDED Requirements。

## ADDED Requirements

### Requirement: Member management page lists and filters members

The system SHALL provide `pages/admin/members/index.vue` that displays a list of users whose role is `member`, with columns for uid, username, email, displayName, account status, last login time, and createdAt. The page SHALL support querying members by username or email via `GET /api/admin/users?role=member` query parameters, with filtering performed server-side. The server SHALL exclude any user with the superadmin custom claim from the result regardless of query parameters.

Account status SHALL be one of "已停用" (disabled), "尚未變更預設密碼" (password setup pending), or "已啟用" (enabled), evaluated in that priority order: a disabled account always shows "已停用" regardless of password-setup state.

#### Scenario: Member manager views member list

- **WHEN** a user with `members:read` permission navigates to `/admin/members`
- **THEN** the page fetches and displays all users whose role is `member` from `GET /api/admin/users?role=member`

#### Scenario: Member manager queries members by username or email

- **WHEN** a user with `members:read` permission enters a search string in the query field and submits
- **THEN** the system calls `GET /api/admin/users?role=member` with the search string as a query parameter and displays only matching members

#### Scenario: Non-member users never appear on the member management page

- **WHEN** the underlying user list contains users with role `admin` or the superadmin custom claim
- **THEN** none of those users appear in the list rendered by `/admin/members`

### Requirement: Admin account management page lists and filters admin accounts

The system SHALL provide `pages/admin/admin-accounts/index.vue` that displays a list of users whose role is not `member` (e.g. `admin`), with columns for uid, username, email, displayName, role, account status, last login time, and createdAt. The page SHALL support querying admin accounts by username or email via `GET /api/admin/users?role=non-member` query parameters, with filtering performed server-side. The server SHALL exclude any user with the superadmin custom claim from the result regardless of query parameters.

Account status SHALL be one of "已停用" (disabled), "尚未變更預設密碼" (password setup pending), or "已啟用" (enabled), evaluated in that priority order: a disabled account always shows "已停用" regardless of password-setup state.

#### Scenario: Admin account manager views admin account list

- **WHEN** a user with `admin-accounts:read` permission navigates to `/admin/admin-accounts`
- **THEN** the page fetches and displays all users whose role is not `member` from `GET /api/admin/users?role=non-member`

#### Scenario: Admin account manager queries admin accounts by username or email

- **WHEN** a user with `admin-accounts:read` permission enters a search string in the query field and submits
- **THEN** the system calls `GET /api/admin/users?role=non-member` with the search string as a query parameter and displays only matching admin accounts

#### Scenario: Member users never appear on the admin account management page

- **WHEN** the underlying user list contains users with role `member`
- **THEN** none of those users appear in the list rendered by `/admin/admin-accounts`

#### Scenario: Superadmin never appears on either page

- **WHEN** the underlying user list contains a user with the superadmin custom claim
- **THEN** that user does not appear on `/admin/members` nor on `/admin/admin-accounts`

## MODIFIED Requirements

### Requirement: Admin toggles a user's enabled/disabled status

The system SHALL allow a user with `members:write` permission to disable or enable a member's account from `pages/admin/members/index.vue`, and a user with `admin-accounts:write` permission to disable or enable an admin account from `pages/admin/admin-accounts/index.vue`. On confirm, the system SHALL call `PATCH /api/admin/users/:id` with `disabled: boolean`, which updates the Firebase Auth account's `disabled` flag, revokes the target user's refresh tokens when disabling, and records an `audit_logs` entry. The system SHALL reject a request where the actor attempts to disable their own account.

#### Scenario: Member manager disables a member

- **WHEN** a user with `members:write` permission confirms disabling a member other than themselves
- **THEN** the system disables the account, the user's active sessions are revoked, and the list shows "已停用"

#### Scenario: Admin account manager disables an admin account

- **WHEN** a user with `admin-accounts:write` permission confirms disabling an admin account other than themselves
- **THEN** the system disables the account, the user's active sessions are revoked, and the list shows "已停用"

#### Scenario: Re-enabling a previously disabled account

- **WHEN** a user with the corresponding `*:write` permission confirms enabling a previously disabled account on either page
- **THEN** the system enables the account and the list shows the user's status based on their password-setup state

#### Scenario: Admin cannot disable their own account

- **WHEN** an admin attempts to disable their own account via `PATCH /api/admin/users/:id`
- **THEN** the system rejects the request and the account remains enabled

### Requirement: Admin regenerates a one-time password-setup link

The system SHALL allow a user with `members:write` permission (on `pages/admin/members/index.vue`) or `admin-accounts:write` permission (on `pages/admin/admin-accounts/index.vue`) to regenerate a one-time password-setup link for a user whose account status is "尚未變更預設密碼", via an action button shown only for such users. On click, the system SHALL call `POST /api/admin/users/:id/setup-link`, which validates the target user still has a pending password setup, generates a new one-time link, records an `audit_logs` entry, and the system SHALL display the link in a dialog with a copy action.

#### Scenario: Manager regenerates a link for a pending user

- **WHEN** a user with the corresponding `*:write` permission clicks the regenerate-link action for a user who has not changed their default password
- **THEN** the system generates a new one-time link and displays it in a dialog with a copy button

#### Scenario: Action not available once password is set

- **WHEN** a user's account status is "已啟用" (password already set)
- **THEN** the regenerate-link action button is not rendered for that row

### Requirement: Admin deletes a disabled user

The system SHALL allow a user with `members:delete` permission to permanently delete a member account from `pages/admin/members/index.vue`, and a user with `admin-accounts:delete` permission to permanently delete an admin account from `pages/admin/admin-accounts/index.vue`, via a delete action button shown only for users whose account status is "已停用" (disabled). On confirm, the system SHALL call `DELETE /api/admin/users/:id`, which re-validates the target user is disabled, rejects deleting the actor's own account, deletes the Firebase Auth account and the Firestore `users` and `user_roles` documents, and records an `audit_logs` entry.

#### Scenario: Member manager deletes a disabled member

- **WHEN** a user with `members:delete` permission confirms deleting a disabled member other than themselves
- **THEN** the system deletes the account and it no longer appears in the member list

#### Scenario: Admin account manager deletes a disabled admin account

- **WHEN** a user with `admin-accounts:delete` permission confirms deleting a disabled admin account other than themselves
- **THEN** the system deletes the account and it no longer appears in the admin account list

#### Scenario: Delete action not available for enabled users

- **WHEN** a user's account status is "已啟用" or "尚未變更預設密碼" (not disabled)
- **THEN** the delete action button is not rendered for that row

#### Scenario: Deleting an enabled user via direct API call is rejected

- **WHEN** a user with the corresponding `*:delete` permission calls `DELETE /api/admin/users/:id` for a user who is not disabled
- **THEN** the system rejects the request and does not delete the account

### Requirement: Admin creates a new user from the user management page

The system SHALL allow a user with `members:create` permission to create a new member account from `pages/admin/members/index.vue` via a "建立會員" button, and a user with `admin-accounts:create` permission to create a new admin account from `pages/admin/admin-accounts/index.vue` via a "建立管理員" button, each opening a dialog (titled to match the triggering button) collecting username (6–8 alphanumeric), optional displayName, optional email, and optional phone. On the member management page, the role field SHALL be fixed to `member` and not selectable. On the admin account management page, the role field SHALL only offer roles other than `member` (currently `admin`), defaulting to `admin`. On submit, the system SHALL call `POST /api/admin/users`, which validates uniqueness of username, defaults `displayName` to the username when omitted, creates the Firebase Auth account and Firestore `users` document, assigns the selected role, generates a one-time password-setup link, and records an `audit_logs` entry.

#### Scenario: Member manager successfully creates a member

- **WHEN** a user with `members:create` permission submits the create-user dialog on `/admin/members` with a valid, unused username
- **THEN** the system creates a user with role `member`, closes the dialog, refreshes the list, shows a success toast, and displays the one-time password-setup link for the manager to copy

#### Scenario: Admin account manager successfully creates an admin account

- **WHEN** a user with `admin-accounts:create` permission submits the create-user dialog on `/admin/admin-accounts` with a valid, unused username and a non-member role
- **THEN** the system creates a user with the selected role, closes the dialog, refreshes the list, shows a success toast, and displays the one-time password-setup link for the manager to copy

#### Scenario: Username already taken

- **WHEN** a manager submits the create-user dialog with a username that already exists
- **THEN** the system displays "此帳號名稱已被使用" and does not create the account

#### Scenario: User without the corresponding create permission does not see the action

- **WHEN** a user without `members:create` permission views `/admin/members`, or without `admin-accounts:create` permission views `/admin/admin-accounts`
- **THEN** the "建立會員" / "建立管理員" button is not rendered in the DOM

### Requirement: Admin exports the user list to CSV

The system SHALL allow a user with `members:read` permission to export the currently filtered member list as a CSV file from `pages/admin/members/index.vue`, and a user with `admin-accounts:read` permission to export the currently filtered admin account list as a CSV file from `pages/admin/admin-accounts/index.vue`, including columns uid, username, email, displayName, role, and createdAt.

#### Scenario: Manager exports filtered results

- **WHEN** a manager applies a search query on either page and clicks "匯出 CSV"
- **THEN** the system generates and downloads a CSV file containing exactly the currently displayed (filtered) rows for that page

#### Scenario: Manager exports without filters

- **WHEN** a manager clicks "匯出 CSV" with no active search query
- **THEN** the system generates and downloads a CSV file containing all rows currently loaded in that page's list
