# RBAC Spec

## Model

Hybrid RBAC + Permission:

- **Role-level**: determines user identity (`superadmin` / `admin` / `member`)
- **Permission-level**: fine-grained operation control (e.g. `users:read`, `users:write`)
- Evaluation order: verify role first → then verify permission

## Default Roles

| Role         | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| `superadmin` | Firebase Auth custom claims, full access, bypasses Firestore |
| `admin`      | Backend management, permissions configured in Firestore      |
| `member`     | Regular user, minimal permissions                            |

## Permission Format

`resource:action` — e.g. `users:read`, `users:write`, `admin:access`

## Firestore Collections

```
roles/{roleId}             { id, name, createdAt }
permissions/{permId}       { id, name, description }
role_permissions/{id}      { roleId, permissionId }
user_roles/{id}            { userId, roleId }
```

## RBAC Middleware

- Reads role from `RequestContext.role`
- Superadmin: short-circuit, inject all permissions
- Others: query `role_permissions` → inject `permissions[]` into context

## Permission Guard

```ts
hasPermission(ctx: AuthenticatedContext, permission: string): boolean
```

Used in service layer to enforce access control.

## Extensibility Constraint

Architecture must support runtime addition of roles and permissions without schema migration.

### Requirement: Frontend conditionally renders superadmin-only actions

The system SHALL use `v-if="isSuperadmin"` (from `useAuthStore`) to hide UI controls that are exclusive to superadmin (e.g. delete role) from admin users.

#### Scenario: Superadmin sees delete role button

- **WHEN** a superadmin views the roles management page
- **THEN** the delete role button is visible and interactive

#### Scenario: Admin does not see delete role button

- **WHEN** an admin (non-superadmin) views the roles management page
- **THEN** the delete role button is not rendered in the DOM

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

### Requirement: `admin_accounts:*` permission set gates admin account management

The system SHALL introduce a permission set `admin_accounts:read`, `admin_accounts:write`, `admin_accounts:create`, `admin_accounts:delete` (format `resource:action`) that controls access to the admin account management page (`/admin/admin-accounts`) and its operations: viewing/searching the admin account list, enabling/disabling an admin account, regenerating a password-setup link, deleting a disabled admin account, and creating a new admin account. The `admin` role SHALL include all four `admin_accounts:*` permissions in its default permission set. The `member` role SHALL NOT include any `admin_accounts:*` permission. `superadmin` bypasses permission checks as with all other permissions.

#### Scenario: Admin has full `admin_accounts:*` permission set

- **WHEN** a user with role `admin` navigates to `/admin/admin-accounts`
- **THEN** the page renders, and all `admin_accounts:*`-gated actions (create, disable/enable, regenerate link, delete) are available per their own scenarios

#### Scenario: Member lacks `admin_accounts:*` permissions

- **WHEN** a user with role `member` calls `GET /api/admin/users?role=non-member`
- **THEN** the server rejects the request with a permission error

#### Scenario: Superadmin always permitted

- **WHEN** a superadmin calls any `admin_accounts:*`-gated endpoint
- **THEN** the request succeeds regardless of Firestore role_permissions data
