# Account Provider Binding Spec

## Purpose

Allow a Firestore `users` account to bind and use additional Firebase Auth login providers (currently Google) independently of the account's `email`/`phone` fields, with eligibility determined by Firebase Auth UID rather than email matching.

## Requirements

### Requirement: User can sign in with an already-bound Google identity via user_auth

The system SHALL determine Google login eligibility by looking up a `user_auth` document with `provider_type: 'google'` whose `provider_user_id` equals the Google-authenticated Firebase Auth UID. Email matching SHALL NOT be used to decide login vs. registration.

#### Scenario: Google login — user_auth document found

- **WHEN** user clicks "以 Google 繼續" and a `user_auth` document exists with `provider_type: 'google'` and `provider_user_id` equal to the Google-authenticated Firebase Auth UID
- **THEN** system resolves the associated internal `userId`, signs the user in, and navigates to `/`

#### Scenario: Google login — no matching user_auth document

- **WHEN** user clicks "以 Google 繼續" and no `user_auth` document exists with `provider_type: 'google'` for that Firebase Auth UID
- **THEN** system enters the Google quick-registration flow (see Requirement: User can quick-register via Google identity via user_auth)

### Requirement: User can quick-register via Google identity via user_auth

The system SHALL treat a Google sign-in where no `user_auth` document exists for `provider_type: 'google'` and that Firebase Auth UID as a registration flow. The system SHALL pre-fill the registration form with information from the Google profile and require the user to choose a unique username. On success, the system SHALL create a new `user` document and a `user_auth(provider_type: 'google')` document, and SHALL assign the default member role and permissions.

#### Scenario: Quick registration via Google — successful

- **WHEN** user clicks "以 Google 繼續", no `user_auth` document matches the Google-authenticated Firebase Auth UID, and user submits a valid username (6–8 alphanumeric)
- **THEN** system creates a new `user` document with `username` and `email` (from Google), creates a `user_auth(provider_type: 'google')` document mapping to that `userId`, assigns the default member role, and navigates to `/`

#### Scenario: Quick registration via Google — username taken

- **WHEN** user is in the Google quick-registration flow and submits a username that already exists
- **THEN** system displays "此帳號名稱已被使用" and keeps user on the registration form

### Requirement: User can bind a Google identity from account profile via user_auth

The system SHALL allow an already-authenticated user (valid idToken) to link a Google account as an additional login provider from the profile page by creating a `user_auth(provider_type: 'google')` document that maps the Google-authenticated Firebase Auth UID to the authenticated user's internal `userId`. Binding SHALL NOT overwrite an existing `email` value on the account, and SHALL NOT require the Google account's email to match the account's bound `email` (if any). The system SHALL call `revokeRefreshTokens` for the account's Firebase uid(s) after binding succeeds.

#### Scenario: Bind Google from profile — success

- **WHEN** an authenticated user clicks "綁定 Google 帳號" on the profile page and completes the Google sign-in popup
- **THEN** system creates a `user_auth(provider_type: 'google')` document mapping the Google-authenticated uid to the user's internal `userId`, calls `revokeRefreshTokens`, and displays "帳號綁定成功，請前往登入"

#### Scenario: Bind Google from profile — Google identity already bound to another account

- **WHEN** user attempts to bind a Google identity for which a `user_auth(provider_type: 'google')` document already exists mapping to a different `userId`
- **THEN** system rejects the binding and displays a binding-failed error without modifying any `user_auth` document

#### Scenario: Bind Google from profile — already bound to this account

- **WHEN** an authenticated user for whom a `user_auth(provider_type: 'google')` document already exists views the profile page
- **THEN** system displays the account as already linked and does not show the "綁定 Google 帳號" button

### Requirement: Account email and phone are optional bindable fields

The system SHALL store `email` and `phone` fields on Firestore `users` documents as optional strings. These fields are informational bindings and do not affect Firebase Auth directly unless used for Google Provider binding.

#### Scenario: Account created without email or phone

- **WHEN** user registers with username and password only (no email, no phone provided)
- **THEN** Firestore `users` document is created with `email: null` and `phone: null`

#### Scenario: Account created with email provided

- **WHEN** user registers with username, password, and an optional email address
- **THEN** Firestore `users` document is created with the provided `email` value
