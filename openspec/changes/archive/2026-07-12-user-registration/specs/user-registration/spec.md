## ADDED Requirements

### Requirement: User can register a new account with email and password

The system SHALL provide a registration page at `/auth/register` where a new user can create a Firebase Auth account by providing a display name, email address, and password. On successful registration the user SHALL be automatically signed in and redirected to `/dashboard`.

#### Scenario: Successful registration

- **WHEN** user submits a valid display name, email, password, and matching confirm password
- **THEN** system creates a Firebase Auth account via `createUserWithEmailAndPassword`, sets the display name via `updateProfile`, obtains a fresh idToken, calls `POST /api/auth/login`, and redirects to `/dashboard`

#### Scenario: Passwords do not match

- **WHEN** user submits a form where password and confirm password fields differ
- **THEN** system displays a validation error and does not call Firebase

#### Scenario: Email already in use

- **WHEN** user submits an email that is already registered with any provider
- **THEN** system catches the `auth/email-already-in-use` Firebase error and displays an error message directing the user to the login page

#### Scenario: Invalid email format

- **WHEN** user submits a malformed email address
- **THEN** system catches the `auth/invalid-email` Firebase error and displays an appropriate error message

#### Scenario: Weak password rejected by Firebase

- **WHEN** user submits a password that does not meet Firebase minimum strength requirements
- **THEN** system catches the `auth/weak-password` Firebase error and displays an error message

### Requirement: Login page links to the registration page

The system SHALL display a "前往註冊" (Go to Register) link on the login page that navigates to `/auth/register`.

#### Scenario: User navigates from login to register

- **WHEN** user clicks the "前往註冊" link on the login page
- **THEN** browser navigates to `/auth/register`

### Requirement: Registration page links back to the login page

The system SHALL display a "已有帳號？前往登入" link on the register page.

#### Scenario: User navigates from register to login

- **WHEN** user clicks the "已有帳號？前往登入" link on the register page
- **THEN** browser navigates to `/auth/login`
