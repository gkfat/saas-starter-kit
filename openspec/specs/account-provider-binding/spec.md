# Account Provider Binding Spec

## Purpose

Allow a Firestore `users` account to bind and use additional Firebase Auth login providers (currently Google) independently of the account's `email`/`phone` fields, with eligibility determined by Firebase Auth UID rather than email matching.

## Requirements

### Requirement: User can sign in with an already-bound Google Provider

The system SHALL determine Google login eligibility by looking up the Firestore `users` document whose doc ID (uid) equals the Google-authenticated Firebase Auth UID and whose `providers` array includes `'google'`. Email matching SHALL NOT be used to decide login vs. registration.

#### Scenario: Google login — uid found with google provider bound

- **WHEN** user clicks "以 Google 繼續" and a Firestore `users` document exists whose doc ID equals the Google-authenticated Firebase Auth UID and whose `providers` includes `'google'`
- **THEN** system signs the user in using the Google-authenticated idToken, POSTs to `/api/auth/login`, and navigates to `/`

#### Scenario: Google login — uid not found or google provider not bound

- **WHEN** user clicks "以 Google 繼續" and no Firestore `users` document exists whose doc ID equals the Google-authenticated Firebase Auth UID with `providers` including `'google'`
- **THEN** system enters the Google quick-registration flow (see Requirement: User can quick-register via Google)

### Requirement: User can quick-register via Google

The system SHALL treat a Google sign-in where no Firestore `users` document matches the Google-authenticated Firebase Auth UID (with `'google'` bound) as a registration flow. The system SHALL pre-fill the registration form with information from the Google profile and require the user to choose a unique username.

#### Scenario: Quick registration via Google — successful

- **WHEN** user clicks "以 Google 繼續", no account matches the Google-authenticated uid, and user submits a valid username (6–8 alphanumeric)
- **THEN** system creates a Firestore `users` document at the Google-authenticated uid with `username`, `email` (from Google), `providers: ['google']`, and navigates to `/`

#### Scenario: Quick registration via Google — username taken

- **WHEN** user is in the Google quick-registration flow and submits a username that already exists
- **THEN** system displays "此帳號名稱已被使用" and keeps user on the registration form

### Requirement: User can bind Google Provider from account profile

The system SHALL allow an already-authenticated user to explicitly link a Google account as an additional login provider from the profile page, independent of any `email` field matching. Binding via profile SHALL NOT overwrite an existing `email` value on the account, and SHALL NOT require the Google account's email to match the account's bound `email` (if any).

#### Scenario: Bind Google from profile — account has no email yet

- **WHEN** an authenticated user without a bound `email` clicks "綁定 Google 帳號" on the profile page and completes the Google sign-in popup
- **THEN** system links the Google credential to the current Firebase Auth account, adds `'google'` to the `providers` array, and leaves `email` as `null`

#### Scenario: Bind Google from profile — account email differs from Google email

- **WHEN** an authenticated user whose account has a bound `email` clicks "綁定 Google 帳號" and completes Google sign-in with a Google account whose email differs from the bound `email`
- **THEN** system links the Google credential and adds `'google'` to the `providers` array without checking or modifying the existing `email` field

#### Scenario: Bind Google from profile — Google account already linked to another Firebase user

- **WHEN** user attempts to link a Google account that Firebase Auth has already linked to a different account
- **THEN** Firebase Auth rejects the link (`auth/credential-already-in-use`) and system displays a binding-failed error without changing `providers`

#### Scenario: Bind Google from profile — already bound

- **WHEN** an authenticated user whose `providers` already includes `'google'` views the profile page
- **THEN** system displays the account as already linked and does not show the "綁定 Google 帳號" button

### Requirement: Account email and phone are optional bindable fields

The system SHALL store `email` and `phone` fields on Firestore `users` documents as optional strings. These fields are informational bindings and do not affect Firebase Auth directly unless used for Google Provider binding.

#### Scenario: Account created without email or phone

- **WHEN** user registers with username and password only (no email, no phone provided)
- **THEN** Firestore `users` document is created with `email: null` and `phone: null`

#### Scenario: Account created with email provided

- **WHEN** user registers with username, password, and an optional email address
- **THEN** Firestore `users` document is created with the provided `email` value
