# Data Spec

## Collection Layout

All collection names include an environment prefix (`dev_` or `prod_`):

```
{prefix}users/{userId}
{prefix}roles/{roleId}
{prefix}permissions/{permissionId}
{prefix}role_permissions/{rolePermissionId}
{prefix}user_roles/{userRoleId}
{prefix}audit_logs/{logId}
{prefix}login_logs/{logId}
```

- `{prefix}` is determined by `prefixCollection()` — `dev_` or `prod_` based on `APP_ENV`

## Collection Schemas

```
users {
  uid          string     // Firebase Auth UID, also used as Firestore doc ID
  username     string     // 6–8 alphanumeric, globally unique, required
  displayName  string     // optional display name
  email        string?    // optional, used for Google Provider binding
  phone        string?    // optional, informational binding
  providers    string[]   // e.g. ['password'], ['password', 'google'], ['google']
  createdAt    Timestamp
}
roles            { id, name, createdAt }
permissions      { id, name, description }
role_permissions { roleId, permissionId }
user_roles       { userId, roleId }
audit_logs       { ...base_log, type: 'audit', action, resourceId, diff }
login_logs       { ...base_log, type: 'login', provider, ip, result }
```

### Users collection schema

The `users` collection document schema includes `username` as a required field; `email` and `phone` are optional. A `providers` array tracks which login providers are bound to the account.

#### Scenario: New user document includes username and providers

- **WHEN** a new user is created via registration
- **THEN** Firestore `users` document contains `username` (non-null), `providers` (non-empty array), and `email`/`phone` as null if not provided

#### Scenario: Username must be globally unique

- **WHEN** service attempts to create a user with a username already present in the `users` collection
- **THEN** repo layer returns a conflict result and no document is written

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

### Seed demo users use new account structure

The seed script creates demo users using the updated `users` schema, assigning each a username and synthetic email, with no required email field.

#### Scenario: Seed script creates valid demo accounts

- **WHEN** the seed script runs against a fresh dev Firestore instance
- **THEN** all seeded user documents contain `username`, `providers`, and valid Firebase Auth accounts using synthetic email `{username}@internal.local`
