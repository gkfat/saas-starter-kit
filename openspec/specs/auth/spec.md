# Auth Spec

## Login Methods

| Method               | Provider                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| Email / Password     | Firebase Auth standard                                                    |
| Google Login         | Firebase Auth Google Provider                                             |
| Phone Auth (SMS OTP) | Firebase Phone Auth — used for phone number verification at profile setup |

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
4. Server injects userId, tenantId, role, permissions into event.context
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
