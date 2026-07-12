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
tenants/{tenantId}/
  ├── roles/{roleId}             { id, name, tenantId, createdAt }
  ├── permissions/{permId}       { id, name, description, tenantId }
  ├── role_permissions/{id}      { roleId, permissionId, tenantId }
  └── user_roles/{id}            { userId, roleId, tenantId }
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
