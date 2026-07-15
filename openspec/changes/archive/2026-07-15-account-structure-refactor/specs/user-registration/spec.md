## MODIFIED Requirements

### Requirement: User can register a new account with username and password

The system SHALL provide a registration page at `/auth/register` where a new user can create an account by providing a username (6–8 alphanumeric), an optional email address, an optional phone number, and a password (6–8 alphanumeric) with confirmation. On successful registration the user SHALL be redirected to `/login`.

#### Scenario: Successful registration with username and password only

- **WHEN** user submits a valid username, matching password and confirm password (no email, no phone)
- **THEN** system creates a Firebase Auth account via `createUserWithEmailAndPassword` using synthetic email `{username}@internal.local`, creates Firestore `users` document with `username`, `email: null`, `phone: null`, `providers: ['password']`, signs out, and redirects to `/login`

#### Scenario: Successful registration with username, email, and password

- **WHEN** user submits a valid username, a valid email address, and matching password
- **THEN** system creates a Firebase Auth account and Firestore `users` document with `email` populated, signs out, and redirects to `/login`

#### Scenario: Passwords do not match

- **WHEN** user submits a form where password and confirm password fields differ
- **THEN** system displays a validation error and does not call Firebase

#### Scenario: Username already taken

- **WHEN** user submits a username that already exists in Firestore
- **THEN** system displays "此帳號名稱已被使用" and does not create a Firebase Auth account

#### Scenario: Username format invalid

- **WHEN** user submits a username that is not 6–8 alphanumeric characters
- **THEN** system displays a validation error describing the format requirement

#### Scenario: Password format invalid

- **WHEN** user submits a password that is not 6–8 alphanumeric characters
- **THEN** system displays a validation error describing the format requirement

## REMOVED Requirements

### Requirement: User can register a new account with email and password

**Reason**: Registration now uses username as the primary identifier. Email is optional.
**Migration**: Re-seed demo users with username-based accounts.

### Requirement: Email already in use (Firebase error handling)

**Reason**: Login no longer uses email as identifier; synthetic email collision is handled by username uniqueness check instead.
**Migration**: Replace with username uniqueness validation at service layer.
