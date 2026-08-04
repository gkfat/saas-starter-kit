## MODIFIED Requirements

### Requirement: User can register with username and password

The system SHALL allow a new user to register by providing a username and password. Username SHALL be 6–8 alphanumeric characters (A-Z, a-z, 0-9) with no special characters. Password SHALL be 6–8 alphanumeric characters.

#### Scenario: Successful registration with username and password

- **WHEN** user submits a valid username (6–8 alphanumeric) and matching password (6–8 alphanumeric)
- **THEN** system creates a Firebase Auth account using synthetic email `{username}@internal.local`, creates a new `user` document with `username`, creates a `user_auth` document with `provider_type: 'password'` and `provider_user_id: username`, and redirects to `/login`

#### Scenario: Username too short or too long

- **WHEN** user submits a username shorter than 6 or longer than 8 characters
- **THEN** system displays a validation error and does not call Firebase

#### Scenario: Username contains special characters

- **WHEN** user submits a username containing any non-alphanumeric character
- **THEN** system displays a validation error and does not call Firebase

#### Scenario: Password too short or too long

- **WHEN** user submits a password shorter than 6 or longer than 8 characters
- **THEN** system displays a validation error and does not call Firebase

#### Scenario: Password contains special characters

- **WHEN** user submits a password containing any non-alphanumeric character
- **THEN** system displays a validation error and does not call Firebase

#### Scenario: Username already taken

- **WHEN** user submits a username for which a `user_auth` document with `provider_type: 'password'` and that `provider_user_id` already exists
- **THEN** system displays an error "此帳號名稱已被使用" and does not create a Firebase Auth account

### Requirement: User can sign in with username and password

The system SHALL allow a user to sign in using their username and password. The system SHALL resolve the username to a synthetic email via the `user_auth(provider_type: 'password')` document and authenticate via Firebase Auth.

#### Scenario: Successful sign-in

- **WHEN** user enters a valid username and correct password
- **THEN** system looks up the `user_auth` document with `provider_type: 'password'` and `provider_user_id` equal to the username, derives the synthetic email, calls `signInWithEmailAndPassword`, obtains idToken, POSTs to `/api/auth/login`, and navigates to `/`

#### Scenario: Username not found

- **WHEN** user enters a username for which no `user_auth(provider_type: 'password')` document exists
- **THEN** system displays "帳號或密碼錯誤" without revealing which field is incorrect

#### Scenario: Incorrect password

- **WHEN** user enters a valid username but incorrect password
- **THEN** Firebase Auth returns auth error; system displays "帳號或密碼錯誤" without revealing which field is incorrect

## ADDED Requirements

### Requirement: User can change password from profile

The system SHALL allow an authenticated user to change or set their password from the profile page. If a `user_auth(provider_type: 'password')` document already exists for the account, the system SHALL require the user to re-authenticate with their current password (via Firebase Auth `signInWithEmailAndPassword`) to obtain a fresh idToken proving ownership, and SHALL verify that idToken's Firebase uid matches the `firebaseUid` recorded on the existing `user_auth(provider_type: 'password')` document before updating the password. If no such document exists (e.g. an account that only has `user_auth(provider_type: 'line')` or `'google'`), the system SHALL allow the user to set a new password directly, creating a new Firebase Auth user and a `user_auth(provider_type: 'password', provider_user_id: username)` document. In both cases, the system SHALL call `revokeRefreshTokens` after a successful change and prompt the user to sign in again.

#### Scenario: Change existing password — correct current password

- **WHEN** an authenticated user with an existing `user_auth(provider_type: 'password')` document submits their correct current password and a valid new password
- **THEN** system re-authenticates via Firebase Auth, verifies the resulting idToken's uid matches the account's password-provider `firebaseUid`, updates the password via Admin SDK, calls `revokeRefreshTokens`, and prompts the user to sign in again

#### Scenario: Change existing password — incorrect current password

- **WHEN** an authenticated user with an existing `user_auth(provider_type: 'password')` document submits an incorrect current password
- **THEN** Firebase Auth rejects the re-authentication and system displays an error without changing the password

#### Scenario: Set password for account with no existing password provider

- **WHEN** an authenticated user with no `user_auth(provider_type: 'password')` document (e.g. LINE-only) submits a valid new password
- **THEN** system creates a new Firebase Auth user, creates a `user_auth(provider_type: 'password', provider_user_id: username)` document mapping to the account's internal `userId`, calls `revokeRefreshTokens`, and prompts the user to sign in again
