## ADDED Requirements

### Requirement: Superadmin account is created via seed script

The system SHALL provide a CLI seed script (`scripts/seed-superadmin.ts`) that creates a superadmin Firebase Auth account using the Admin SDK. The script MUST read credentials from environment variables (`SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`) and MUST NOT write any data to Firestore.

#### Scenario: Seed creates superadmin when account does not exist

- **WHEN** the seed script is run and no Firebase Auth account exists for `SUPERADMIN_EMAIL`
- **THEN** the script creates the account via `createUser`, sets custom claims `{ role: 'superadmin' }` via `setCustomUserClaims`, and exits with a success message

#### Scenario: Seed is idempotent when superadmin already exists

- **WHEN** the seed script is run and a Firebase Auth account for `SUPERADMIN_EMAIL` already has custom claims `{ role: 'superadmin' }`
- **THEN** the script skips creation, logs a warning, and exits without error

#### Scenario: Seed rejects ambiguous existing account

- **WHEN** the seed script is run and a Firebase Auth account for `SUPERADMIN_EMAIL` exists but does NOT have `role: 'superadmin'` in its custom claims
- **THEN** the script throws an error and exits without modifying the existing account

### Requirement: Only one superadmin account is permitted per tenant

The system SHALL enforce that at most one Firebase Auth account holds the `role: 'superadmin'` custom claim per tenant. The seed script MUST NOT create a second superadmin if one already exists.

#### Scenario: Attempt to seed a second superadmin

- **WHEN** a Firebase Auth account with `role: 'superadmin'` already exists and the seed script is run with a different email
- **THEN** the script detects the conflict via the existing account check and throws an error

### Requirement: Superadmin identity is never stored in Firestore

The system SHALL identify superadmin solely through Firebase Auth custom claims (`role: 'superadmin'`). No superadmin UID, email, or marker SHALL be written to any Firestore collection.

#### Scenario: Server resolves superadmin role from token claims only

- **WHEN** a superadmin user's idToken is verified by `auth.service.verifyIdToken`
- **THEN** the resolved `AuthUser.role` is `'superadmin'` derived from `decoded['role']` claim, without any Firestore lookup

### Requirement: Unused superadmin env vars are removed from runtime config

The system SHALL remove `superadminEmail` and `superadminUid` from `nuxt.config.ts` runtimeConfig and their corresponding entries from `.env.example`, as they are not consumed by any server code.

#### Scenario: Runtime config no longer exposes superadmin fields

- **WHEN** the Nuxt server starts
- **THEN** `useRuntimeConfig()` does not include `superadminEmail` or `superadminUid` fields
