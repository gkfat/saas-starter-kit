## MODIFIED Requirements

### Requirement: Users collection schema

The `users` collection document schema SHALL be updated to include `username` as a required field and make `email` and `phone` optional. A `providers` array SHALL track which login providers are bound to the account.

Updated schema:

```
users {
  uid          string     // Firebase Auth UID, also used as Firestore doc ID
  username     string     // 6–8 alphanumeric, unique across tenant, required
  displayName  string     // optional display name
  email        string?    // optional, used for Google Provider binding
  phone        string?    // optional, informational binding
  providers    string[]   // e.g. ['password'], ['password', 'google'], ['google']
  tenantId     string
  createdAt    Timestamp
}
```

#### Scenario: New user document includes username and providers

- **WHEN** a new user is created via registration
- **THEN** Firestore `users` document contains `username` (non-null), `providers` (non-empty array), and `email`/`phone` as null if not provided

#### Scenario: Username must be unique within tenant

- **WHEN** service attempts to create a user with a username already present in the same tenant's `users` collection
- **THEN** repo layer returns a conflict result and no document is written

## ADDED Requirements

### Requirement: Seed demo users use new account structure

The seed script SHALL create demo users using the updated `users` schema, assigning each a username and synthetic email, with no required email field.

#### Scenario: Seed script creates valid demo accounts

- **WHEN** the seed script runs against a fresh dev Firestore instance
- **THEN** all seeded user documents contain `username`, `providers`, and valid Firebase Auth accounts using synthetic email `{username}@internal.local`
