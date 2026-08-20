## REMOVED Requirements

### Requirement: LINE Login via Web OAuth in admin app

**Reason**: `apps/admin` 後台重新定位為僅供管理員（admin / superadmin）登入，不再對一般會員開放自助註冊/登入，故移除 admin app 的 LINE Web OAuth 登入入口與其對應的 `/auth/line-callback` 頁面。

**Migration**: 一般會員的 LINE 登入/註冊改由 `apps/liff` 提供（見 `line-liff-identity` spec），admin app 僅保留帳密登入與 Google 登入兩種方式。

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

## MODIFIED Requirements

### Requirement: LINE Login via LIFF as an additional login method

The system SHALL support LINE Login through the LIFF frontend as an additional login method alongside Username/Password, Google, and Phone Auth. LINE Login SHALL NOT be offered from the admin app; the admin app SHALL only support Username/Password and Google login. Unlike Google (a Firebase Auth-native provider linked via `linkWithCredential` to the same Firebase uid), LINE identities SHALL be tracked independently of Firebase Auth through the `user_auth` data model (see `line-liff-identity` spec), since LINE is not a Firebase Auth-native provider in this system.

#### Scenario: LINE login recorded distinctly from Google's native-linking model

- **WHEN** a user signs in via LINE Login through the LIFF app
- **THEN** system resolves the login through a `user_auth` document lookup rather than through Firebase Auth's native provider-linking/`providers` array mechanism used for Google

#### Scenario: Admin app does not offer LINE login

- **WHEN** a user visits the admin app's login page (`/login`)
- **THEN** the page SHALL only present Username/Password login and Google login; no LINE login option SHALL be shown
