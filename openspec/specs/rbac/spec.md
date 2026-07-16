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
