## MODIFIED Requirements

### Requirement: User management page lists and filters users

The system SHALL provide `pages/admin/users/index.vue` that displays a list of users with columns for uid, username, email, displayName, role, account status, last login time, and createdAt. The page SHALL support querying users by username, email, and role via `GET /api/admin/users` query parameters, with filtering performed server-side.

Account status SHALL be one of "已停用" (disabled), "尚未變更預設密碼" (password setup pending), or "已啟用" (enabled), evaluated in that priority order: a disabled account always shows "已停用" regardless of password-setup state.

#### Scenario: Admin views user list

- **WHEN** admin navigates to `/admin/users`
- **THEN** the page fetches and displays all users from `GET /api/admin/users`

#### Scenario: Admin queries users by username or email

- **WHEN** admin enters a search string in the query field and submits
- **THEN** the system calls `GET /api/admin/users` with the search string as a query parameter and displays only matching users

#### Scenario: Admin filters users by role

- **WHEN** admin selects a role from the role filter
- **THEN** the system calls `GET /api/admin/users` with the selected role as a query parameter and displays only users with that role

#### Scenario: Admin changes a user's role

- **WHEN** admin selects a new role for a user and confirms
- **THEN** the system calls `PATCH /api/admin/users/:id` with the new role and updates the display

## ADDED Requirements

### Requirement: Admin toggles a user's enabled/disabled status

The system SHALL allow a user with `users:write` permission to disable or enable another user's account from `pages/admin/users/index.vue`. On confirm, the system SHALL call `PATCH /api/admin/users/:id` with `disabled: boolean`, which updates the Firebase Auth account's `disabled` flag, revokes the target user's refresh tokens when disabling, and records an `audit_logs` entry. The system SHALL reject a request where the actor attempts to disable their own account.

#### Scenario: Admin disables a user

- **WHEN** an admin with `users:write` permission confirms disabling a user other than themselves
- **THEN** the system disables the account, the user's active sessions are revoked, and the list shows "已停用"

#### Scenario: Admin re-enables a user

- **WHEN** an admin with `users:write` permission confirms enabling a previously disabled user
- **THEN** the system enables the account and the list shows the user's status based on their password-setup state

#### Scenario: Admin cannot disable their own account

- **WHEN** an admin attempts to disable their own account via `PATCH /api/admin/users/:id`
- **THEN** the system rejects the request and the account remains enabled

### Requirement: Admin regenerates a one-time password-setup link

The system SHALL allow a user with `users:write` permission to regenerate a one-time password-setup link for a user whose account status is "尚未變更預設密碼", via an action button shown only for such users in `pages/admin/users/index.vue`. On click, the system SHALL call `POST /api/admin/users/:id/setup-link`, which validates the target user still has a pending password setup, generates a new one-time link, records an `audit_logs` entry, and the system SHALL display the link in a dialog with a copy action.

#### Scenario: Admin regenerates a link for a pending user

- **WHEN** an admin with `users:write` permission clicks the regenerate-link action for a user who has not changed their default password
- **THEN** the system generates a new one-time link and displays it in a dialog with a copy button

#### Scenario: Action not available once password is set

- **WHEN** a user's account status is "已啟用" (password already set)
- **THEN** the regenerate-link action button is not rendered for that row

### Requirement: Admin deletes a disabled user

The system SHALL allow a user with `users:delete` permission to permanently delete a user account from `pages/admin/users/index.vue`, via a delete action button shown only for users whose account status is "已停用" (disabled). On confirm, the system SHALL call `DELETE /api/admin/users/:id`, which re-validates the target user is disabled, rejects deleting the actor's own account, deletes the Firebase Auth account and the Firestore `users` and `user_roles` documents, and records an `audit_logs` entry.

#### Scenario: Admin deletes a disabled user

- **WHEN** an admin with `users:delete` permission confirms deleting a disabled user other than themselves
- **THEN** the system deletes the account and it no longer appears in the user list

#### Scenario: Delete action not available for enabled users

- **WHEN** a user's account status is "已啟用" or "尚未變更預設密碼" (not disabled)
- **THEN** the delete action button is not rendered for that row

#### Scenario: Deleting an enabled user via direct API call is rejected

- **WHEN** an admin with `users:delete` permission calls `DELETE /api/admin/users/:id` for a user who is not disabled
- **THEN** the system rejects the request and does not delete the account

### Requirement: Admin creates a new user from the user management page

The system SHALL allow a user with `users:create` permission to create a new user account from `pages/admin/users/index.vue` via a dialog collecting username (6–8 alphanumeric), optional displayName, optional email, optional phone, and a role (defaulting to `member`). On submit, the system SHALL call `POST /api/admin/users`, which validates uniqueness of username, defaults `displayName` to the username and `role` to `member` when omitted, creates the Firebase Auth account and Firestore `users` document, assigns the selected role, generates a one-time password-setup link, and records an `audit_logs` entry.

#### Scenario: Admin successfully creates a user

- **WHEN** an admin with `users:create` permission submits the create-user dialog with a valid, unused username and a role
- **THEN** the system creates the user, closes the dialog, refreshes the list, shows a success toast, and displays the one-time password-setup link for the admin to copy

#### Scenario: Username already taken

- **WHEN** an admin submits the create-user dialog with a username that already exists
- **THEN** the system displays "此帳號名稱已被使用" and does not create the account

#### Scenario: User without `users:create` permission does not see the action

- **WHEN** a user without `users:create` permission views `/admin/users`
- **THEN** the "建立使用者" button is not rendered in the DOM

### Requirement: Admin exports the user list to CSV

The system SHALL allow a user with `users:read` permission to export the currently filtered user list (per the active query/role filters) as a CSV file from `pages/admin/users/index.vue`, including columns uid, username, email, displayName, role, and createdAt.

#### Scenario: Admin exports filtered results

- **WHEN** admin applies a query or role filter and clicks "匯出 CSV"
- **THEN** the system generates and downloads a CSV file containing exactly the currently displayed (filtered) user rows

#### Scenario: Admin exports without filters

- **WHEN** admin clicks "匯出 CSV" with no active filters
- **THEN** the system generates and downloads a CSV file containing all users currently loaded in the list

### Requirement: New user sets initial password via a one-time link

The system SHALL provide a public page `pages/auth/set-password.vue` that accepts a one-time `token` query parameter. On submit with a valid, unexpired, unused token and a valid password, the system SHALL call `POST /api/auth/set-password`, which sets the user's password, marks the token as used, and the page SHALL redirect to `/login`.

#### Scenario: User sets password via valid link

- **WHEN** a user opens `/auth/set-password?token=<valid>` and submits a valid password
- **THEN** the system sets the password, invalidates the token, and redirects to `/login`

#### Scenario: Token expired or already used

- **WHEN** a user submits a password with an expired or already-used token
- **THEN** the system rejects the request with an error and does not change the password
