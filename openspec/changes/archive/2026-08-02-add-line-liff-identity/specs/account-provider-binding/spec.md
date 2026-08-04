## REMOVED Requirements

### Requirement: User can sign in with an already-bound Google Provider

**Reason**: Superseded by the unified `user_auth` provider model (see `line-liff-identity` spec's pattern, now generalized to Google). Google no longer links to the same Firebase uid as the account's primary login; eligibility is now resolved via a `user_auth` document lookup instead of comparing the Google-authenticated Firebase Auth UID against a `providers` array on the same-uid `users` document.
**Migration**: Replaced by the "User can sign in with an already-bound Google identity via user_auth" requirement below.

The system SHALL determine Google login eligibility by looking up the Firestore `users` document whose doc ID (uid) equals the Google-authenticated Firebase Auth UID and whose `providers` array includes `'google'`. Email matching SHALL NOT be used to decide login vs. registration.

#### Scenario: Google login — uid found with google provider bound

- **WHEN** user clicks "以 Google 繼續" and a Firestore `users` document exists whose doc ID equals the Google-authenticated Firebase Auth UID and whose `providers` includes `'google'`
- **THEN** system signs the user in using the Google-authenticated idToken, POSTs to `/api/auth/login`, and navigates to `/`

#### Scenario: Google login — uid not found or google provider not bound

- **WHEN** user clicks "以 Google 繼續" and no Firestore `users` document exists whose doc ID equals the Google-authenticated Firebase Auth UID with `providers` including `'google'`
- **THEN** system enters the Google quick-registration flow (see Requirement: User can quick-register via Google)

### Requirement: User can quick-register via Google

**Reason**: Superseded by the unified `user_auth` provider model. Registration eligibility is now determined by the absence of a `user_auth` document for the Google identity, not by the absence of a Firestore `users` document at the Google-authenticated uid.
**Migration**: Replaced by the "User can quick-register via Google identity via user_auth" requirement below.

The system SHALL treat a Google sign-in where no Firestore `users` document matches the Google-authenticated Firebase Auth UID (with `'google'` bound) as a registration flow. The system SHALL pre-fill the registration form with information from the Google profile and require the user to choose a unique username.

#### Scenario: Quick registration via Google — successful

- **WHEN** user clicks "以 Google 繼續", no account matches the Google-authenticated uid, and user submits a valid username (6–8 alphanumeric)
- **THEN** system creates a Firestore `users` document at the Google-authenticated uid with `username`, `email` (from Google), `providers: ['google']`, and navigates to `/`

#### Scenario: Quick registration via Google — username taken

- **WHEN** user is in the Google quick-registration flow and submits a username that already exists
- **THEN** system displays "此帳號名稱已被使用" and keeps user on the registration form

### Requirement: User can bind Google Provider from account profile

**Reason**: Superseded by the unified `user_auth` provider model. Binding no longer uses Firebase Auth's native `linkWithCredential`; it creates a `user_auth(provider=google)` document mapping the Google identity's own Firebase uid to the authenticated user's internal `userId`.
**Migration**: Replaced by the "User can bind a Google identity from account profile via user_auth" requirement below.

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

## ADDED Requirements

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
