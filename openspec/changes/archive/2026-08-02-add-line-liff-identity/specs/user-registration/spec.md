## MODIFIED Requirements

### Requirement: User can register a new account with username and password

The system SHALL provide a registration page at `/auth/register` where a new user can create an account by providing a username (6–8 alphanumeric), an optional email address, an optional phone number, and a password (6–8 alphanumeric) with confirmation. On successful registration the user SHALL be redirected to `/login`.

#### Scenario: Successful registration with username and password only

- **WHEN** user submits a valid username, matching password and confirm password (no email, no phone)
- **THEN** system creates a Firebase Auth account via `createUserWithEmailAndPassword` using synthetic email `{username}@internal.local`, creates a new `user` document with `username`, `email: null`, `phone: null`, creates a `user_auth` document with `provider_type: 'password'` and `provider_user_id: username` mapping to that `userId`, signs out, and redirects to `/login`

#### Scenario: Successful registration with username, email, and password

- **WHEN** user submits a valid username, a valid email address, and matching password
- **THEN** system creates a Firebase Auth account, a new `user` document with `email` populated, and a `user_auth(provider_type: 'password')` document, signs out, and redirects to `/login`

#### Scenario: Passwords do not match

- **WHEN** user submits a form where password and confirm password fields differ
- **THEN** system displays a validation error and does not call Firebase

#### Scenario: Username already taken

- **WHEN** user submits a username for which a `user_auth` document with `provider_type: 'password'` and that `provider_user_id` already exists
- **THEN** system displays "此帳號名稱已被使用" and does not create a Firebase Auth account

#### Scenario: Username format invalid

- **WHEN** user submits a username that is not 6–8 alphanumeric characters
- **THEN** system displays a validation error describing the format requirement

#### Scenario: Password format invalid

- **WHEN** user submits a password that is not 6–8 alphanumeric characters
- **THEN** system displays a validation error describing the format requirement
