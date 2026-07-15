# Account Username Auth Spec

## Purpose

Provide username/password as the primary registration and login mechanism, using a synthetic Firebase Auth email (`{username}@internal.local`) so that email is no longer required as a login identifier.

## Requirements

### Requirement: User can register with username and password

The system SHALL allow a new user to register by providing a username and password. Username SHALL be 6–8 alphanumeric characters (A-Z, a-z, 0-9) with no special characters. Password SHALL be 6–8 alphanumeric characters.

#### Scenario: Successful registration with username and password

- **WHEN** user submits a valid username (6–8 alphanumeric) and matching password (6–8 alphanumeric)
- **THEN** system creates a Firebase Auth account using synthetic email `{username}@internal.local`, stores a `users` document with `username`, `providers: ['password']`, and redirects to `/login`

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

- **WHEN** user submits a username that already exists in Firestore `users` collection
- **THEN** system displays an error "此帳號名稱已被使用" and does not create a Firebase Auth account

### Requirement: User can sign in with username and password

The system SHALL allow a user to sign in using their username and password. The system SHALL resolve the username to a synthetic email and authenticate via Firebase Auth.

#### Scenario: Successful sign-in

- **WHEN** user enters a valid username and correct password
- **THEN** system queries Firestore for `username` match, retrieves synthetic email, calls `signInWithEmailAndPassword`, obtains idToken, POSTs to `/api/auth/login`, and navigates to `/`

#### Scenario: Username not found

- **WHEN** user enters a username that does not exist in Firestore
- **THEN** system displays "帳號或密碼錯誤" without revealing which field is incorrect

#### Scenario: Incorrect password

- **WHEN** user enters a valid username but incorrect password
- **THEN** Firebase Auth returns auth error; system displays "帳號或密碼錯誤" without revealing which field is incorrect
