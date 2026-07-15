# User Registration Spec

## Purpose

允許新使用者以 username/password 自行建立帳號，email 與 phone 為選填綁定欄位。註冊成功後導向登入頁，由使用者手動登入。

## Requirements

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

### Requirement: Login page links to the registration page

The system SHALL display a "前往註冊" link on the login page that navigates to `/auth/register`.

#### Scenario: User navigates from login to register

- **WHEN** user clicks the "前往註冊" link on the login page
- **THEN** browser navigates to `/auth/register`

### Requirement: Registration page links back to the login page

The system SHALL display a "已有帳號？前往登入" link on the register page.

#### Scenario: User navigates from register to login

- **WHEN** user clicks the "已有帳號？前往登入" link on the register page
- **THEN** browser navigates to `/login`

## Constraints

- Firebase `createUserWithEmailAndPassword` automatically signs the user in — must call `signOut` after `updateProfile` to clear the session before redirecting to login
- `/auth/register` must be added to `PUBLIC_ROUTES` in `middleware/auth.global.ts`
- `register()` composable method must only run in browser — guarded via `getFirebaseAuth()` which throws on server
