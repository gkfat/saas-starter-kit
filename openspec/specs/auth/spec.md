# Auth Spec

## Login Methods

| Method               | Provider                                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Username / Password  | Firebase Auth via synthetic email `{username}@internal.local` — primary login method                                                                                                                |
| Google Login         | Firebase Auth Google Provider — secondary provider, resolved via `user_auth(provider_type: 'google')` lookup, otherwise triggers quick-register (see `account-provider-binding` spec)               |
| LINE Login           | Not a Firebase Auth-native provider — resolved via `user_auth(provider_type: 'line')` lookup (see `line-liff-identity` spec). Available via the LIFF frontend and, as Web OAuth, from the admin app |
| Phone Auth (SMS OTP) | Firebase Phone Auth — used for phone number verification at profile setup                                                                                                                           |

#### Scenario: Username/password login replaces email/password

- **WHEN** user submits a username and password on the login page
- **THEN** system resolves username to synthetic email via Firestore lookup, then authenticates with Firebase Auth using that synthetic email and the provided password

#### Scenario: Google login as secondary provider

- **WHEN** user clicks "以 Google 繼續" on the login page
- **THEN** system initiates Google OAuth flow and routes to sign-in or quick-register based on whether the Google-authenticated Firebase Auth UID matches a Firestore user with `'google'` bound (see account-provider-binding spec)

## Superadmin

- Pre-created account in Firebase Auth
- Custom claims: `{ role: 'superadmin' }`
- Credentials managed via environment variables
- Bypasses all Firestore role/permission lookups
- Requires Firebase Blaze plan for Phone Auth

## Auth Flow

```
1. Browser: Firebase Client SDK handles sign-in (composables/useAuth.ts)
2. Browser gets idToken → POST /api/auth/login
3. Server: auth.service.verifyIdToken() via Admin SDK
4. Server injects userId, role, permissions into event.context
5. Protected routes read from event.context (typed as AuthenticatedContext)
```

## Client Route Guard

`middleware/auth.global.ts` — runs on every navigation:

- Unauthenticated → redirect to `/login`
- Authenticated visiting `/login` or `/otp` → redirect to `/`

## Constraints

- Firebase Client SDK (sign-in, OTP) must only run in browser — composables need `import.meta.client` guard
- Phone Auth requires Firebase Blaze billing plan

## Login Log

Every login attempt writes a `login_log` entry via `modules/logs/`:

```ts
type LoginLog = BaseLog & {
  type: 'login';
  provider: 'email' | 'google' | 'phone' | 'line';
  ip: string;
  result: 'success' | 'failure';
};
```

## Requirements

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
