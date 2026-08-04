## ADDED Requirements

### Requirement: LINE Login via LIFF as an additional login method

The system SHALL support LINE Login through the LIFF frontend as an additional login method alongside Username/Password, Google, and Phone Auth. Unlike Google (a Firebase Auth-native provider linked via `linkWithCredential` to the same Firebase uid), LINE identities SHALL be tracked independently of Firebase Auth through the `user_auth` data model (see `line-liff-identity` spec), since LINE is not a Firebase Auth-native provider in this system.

#### Scenario: LINE login recorded distinctly from Google's native-linking model

- **WHEN** a user signs in via LINE Login through the LIFF app
- **THEN** system resolves the login through a `user_auth` document lookup rather than through Firebase Auth's native provider-linking/`providers` array mechanism used for Google

### Requirement: Login log records LINE provider

Every login attempt via LINE SHALL write a `login_log` entry via `modules/logs/` with `provider: 'line'`, consistent with how `email`, `google`, and `phone` logins are recorded.

#### Scenario: Successful LINE login writes a login log

- **WHEN** a user successfully signs in via LINE Login
- **THEN** system writes a `login_log` entry with `provider: 'line'` and `result: 'success'`

### Requirement: LINE Login via Web OAuth in admin app

The system SHALL support LINE Login from the admin app (a regular browser page, not LIFF app-embedded) via standard LINE Login Web OAuth (`/oauth2/v2.1/authorize` redirect, authorization code exchanged for an `id_token` server-side using the channel secret). The identity-resolution logic (look up `user_auth`, return `ready` with a custom token or `quick-register`) SHALL be shared between the LIFF flow and the admin Web OAuth flow via a common service function, rather than duplicated per endpoint. Quick-registration from the admin Web OAuth flow SHALL reuse the existing `POST /api/auth/line-register` endpoint.

#### Scenario: Admin LINE login — existing account

- **WHEN** an admin app user completes the LINE Login OAuth redirect and the resulting LINE identity has an existing `user_auth(provider_type: 'line')` document
- **THEN** system exchanges the authorization code for an `id_token` server-side, resolves the account via the shared identity-resolution function, returns a Firebase custom token, and the client signs in and navigates to `/dashboard`

#### Scenario: Admin LINE login — no matching account

- **WHEN** an admin app user completes the LINE Login OAuth redirect and no `user_auth(provider_type: 'line')` document exists for that LINE identity
- **THEN** system returns a quick-registration response and the client shows a registration form; upon submitting a valid username, the client calls the existing `POST /api/auth/line-register` endpoint to create the account

#### Scenario: Admin LINE login — code exchange fails

- **WHEN** the authorization code exchange with LINE's token endpoint fails (expired, already used, or network error)
- **THEN** system returns an error response and the client redirects back to the login page with a retry prompt, without reusing the same authorization code
