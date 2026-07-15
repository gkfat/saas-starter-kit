## MODIFIED Requirements

### Requirement: Login Methods

The system SHALL support the following login methods:

| Method               | Provider                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Username / Password  | Firebase Auth via synthetic email `{username}@internal.local` — primary login method                                                                                         |
| Google Login         | Firebase Auth Google Provider — secondary provider, requires a Firestore user matching the Google-authenticated uid with `'google'` bound, otherwise triggers quick-register |
| Phone Auth (SMS OTP) | Firebase Phone Auth — used for phone number verification at profile setup (unchanged)                                                                                        |

#### Scenario: Username/password login replaces email/password

- **WHEN** user submits a username and password on the login page
- **THEN** system resolves username to synthetic email via Firestore lookup, then authenticates with Firebase Auth using that synthetic email and the provided password

#### Scenario: Google login as secondary provider

- **WHEN** user clicks "以 Google 繼續" on the login page
- **THEN** system initiates Google OAuth flow and routes to sign-in or quick-register based on whether the Google-authenticated Firebase Auth UID matches a Firestore user with `'google'` bound (see account-provider-binding spec)

## REMOVED Requirements

### Requirement: Email / Password direct login

**Reason**: Replaced by username/password login. Email is now an optional binding field, not a login identifier.
**Migration**: Existing demo users must be re-seeded with username and synthetic email. No production data to migrate.
