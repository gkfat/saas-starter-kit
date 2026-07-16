## ADDED Requirements

### Requirement: `users:create` permission gates admin-created user accounts

The system SHALL introduce a new permission `users:create` (format `resource:action`) that controls the ability to create a new user account directly from the admin panel. The `admin` role SHALL include `users:create` in its default permission set. The `member` role SHALL NOT include `users:create`. `superadmin` bypasses permission checks as with all other permissions.

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

The system SHALL introduce a new permission `users:delete` (format `resource:action`), independent from `users:write` and `users:create`, that controls the ability to permanently delete a user account from the admin panel. The `admin` role SHALL include `users:delete` in its default permission set. The `member` role SHALL NOT include `users:delete`. `superadmin` bypasses permission checks as with all other permissions.

#### Scenario: Admin has `users:delete` permission

- **WHEN** a user with role `admin` opens the user management page
- **THEN** the delete action is visible for disabled users and `DELETE /api/admin/users/:id` succeeds when invoked on a disabled user

#### Scenario: Member lacks `users:delete` permission

- **WHEN** a user with role `member` calls `DELETE /api/admin/users/:id`
- **THEN** the server rejects the request with a permission error and does not delete the user

#### Scenario: Superadmin always permitted

- **WHEN** a superadmin calls `DELETE /api/admin/users/:id` for a disabled user
- **THEN** the request succeeds regardless of Firestore role_permissions data
