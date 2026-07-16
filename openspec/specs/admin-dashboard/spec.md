# Admin Dashboard Spec

## Purpose

Provides a protected admin interface for managing users, roles, and logs. Access is gated by the `admin:access` permission.

## Requirements

### Requirement: Admin layout with navigation sidebar

The system SHALL provide a dedicated admin layout (`layouts/admin.vue`) with a sidebar containing navigation links to all admin sections: Users, Roles, Login Logs, Audit Logs.

#### Scenario: Admin navigates to dashboard

- **WHEN** a user with `admin:access` permission visits `/admin`
- **THEN** the admin layout renders with a sidebar and the dashboard home page content

### Requirement: Admin route guard enforces admin:access permission

The system SHALL redirect any user without `admin:access` permission away from `/admin/*` routes to `/`.

#### Scenario: Unauthorized user visits admin route

- **WHEN** a user without `admin:access` permission navigates to any `/admin/*` path
- **THEN** `middleware/auth.global.ts` redirects them to `/`

#### Scenario: Authorized user accesses admin route

- **WHEN** a user with `admin:access` permission navigates to `/admin`
- **THEN** the page renders without redirect

### Requirement: User management page lists and filters users

The system SHALL provide `pages/admin/users/index.vue` that displays a list of users with columns for email, displayName, role, and createdAt, and supports filtering by email.

#### Scenario: Admin views user list

- **WHEN** admin navigates to `/admin/users`
- **THEN** the page fetches and displays all users from `GET /api/admin/users`

#### Scenario: Admin filters users by email

- **WHEN** admin enters a search string in the email filter field
- **THEN** the displayed list is filtered to users whose email contains the search string

#### Scenario: Admin changes a user's role

- **WHEN** admin selects a new role for a user and confirms
- **THEN** the system calls `PATCH /api/admin/users/:id` with the new role and updates the display

### Requirement: Roles management page displays role-permission mapping

The system SHALL provide `pages/admin/roles/index.vue` that lists all roles and their associated permissions.

#### Scenario: Admin views roles list

- **WHEN** admin navigates to `/admin/roles`
- **THEN** the page displays all roles with their corresponding permissions

### Requirement: Login logs page displays login history

The system SHALL provide `pages/admin/logs/login.vue` backed by `GET /api/admin/logs/login` (requires `admin:access`), displaying timestamp, email, provider, and result for each login event.

#### Scenario: Admin views login logs

- **WHEN** admin navigates to `/admin/logs/login`
- **THEN** the page fetches and displays login log entries from Firestore

### Requirement: Audit log page displays data change history

The system SHALL provide `pages/admin/logs/audit.vue` backed by `GET /api/admin/logs/audit` (requires `admin:access`), displaying timestamp, actor, action, and diff for each audit event.

#### Scenario: Admin views audit logs

- **WHEN** admin navigates to `/admin/logs/audit`
- **THEN** the page fetches and displays audit log entries from Firestore
