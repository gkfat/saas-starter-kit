# Auth Spec

## Login Methods

| Method               | Provider                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Username / Password  | Firebase Auth via synthetic email `{username}@internal.local` — primary login method                                                                                         |
| Google Login         | Firebase Auth Google Provider — secondary provider, requires a Firestore user matching the Google-authenticated uid with `'google'` bound, otherwise triggers quick-register |
| Phone Auth (SMS OTP) | Firebase Phone Auth — used for phone number verification at profile setup                                                                                                    |

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
  provider: 'email' | 'google' | 'phone';
  ip: string;
  result: 'success' | 'failure';
};
```
