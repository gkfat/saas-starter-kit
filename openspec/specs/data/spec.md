# Data Spec

## Multi-Tenant Design

All data is isolated by `tenantId` at the top level:

```
tenants/{tenantId}/
  ├── users/{userId}
  ├── roles/{roleId}
  ├── permissions/{permissionId}
  ├── role_permissions/{rolePermissionId}
  ├── user_roles/{userRoleId}
  ├── audit_logs/{logId}
  └── login_logs/{logId}
```

- `tenantId` comes from Firebase Auth custom claims
- Defaults to `'default'` when absent
- Every Firestore query must include `tenantId` filter

## Collection Schemas

```
users            { uid, email, displayName, tenantId, createdAt }
roles            { id, name, tenantId, createdAt }
permissions      { id, name, description, tenantId }
role_permissions { roleId, permissionId, tenantId }
user_roles       { userId, roleId, tenantId }
audit_logs       { ...base_log, type: 'audit', action, resourceId, diff }
login_logs       { ...base_log, type: 'login', provider, ip, result }
```

## Repo Layer Rules

- Each module's Firestore operations are encapsulated in `*.repo.ts`
- Service never calls Firestore SDK directly — always goes through repo
- Repo handles only CRUD, no business logic

## Seed Data

Default data seeded on first deploy:

**Roles**: `superadmin`, `admin`, `member`

**Permissions**:

- `users:read`
- `users:write`
- `admin:access`

**role_permissions**:

- `admin` → `users:read`, `users:write`, `admin:access`
- `member` → `users:read`
