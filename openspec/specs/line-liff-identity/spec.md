# LINE LIFF Identity Spec

## Purpose

Allow a user to register/sign in via LINE Login through the LIFF frontend and interoperate with the existing member system, so the same person maps to a single account regardless of whether they registered via the SaaS frontend, were created by an admin, or registered via LINE. LINE is not a Firebase Auth-native provider, so identity mapping is maintained independently of Firebase Auth through a `user` / `user_auth` data model owned by `modules/identity`.

## Requirements

### Requirement: User can register or sign in via LINE LIFF

The system SHALL allow a user to sign in through the LIFF frontend using LINE Login. When no `user_auth` document exists for `provider_type = 'line'` and the LINE-authenticated `provider_user_id`, the system SHALL treat the sign-in as a registration flow: the LIFF frontend SHALL prompt the user to choose a username (consistent with the Google quick-register flow), and on submission SHALL create a new `user` document and a corresponding `user_auth` document, and SHALL assign the default member role and permissions (identical to a user who self-registers via the SaaS frontend). The system SHALL NOT auto-generate a username on the user's behalf.

#### Scenario: First-time LINE login prompts for a username

- **WHEN** a user opens the LIFF app, completes LINE Login, and no `user_auth` document exists for that LINE `provider_user_id`
- **THEN** system does not create any `user`/`user_auth` document yet, and the LIFF frontend shows a registration form asking the user to choose a username

#### Scenario: Submitting the LINE quick-register form creates a new account

- **WHEN** a user who reached the LINE quick-register form submits a valid, available username
- **THEN** system creates a new `user` document and a `user_auth` document with `provider_type: 'line'`, assigns the default member role, and signs the user in

#### Scenario: Returning LINE user signs in

- **WHEN** a user opens the LIFF app, completes LINE Login, and a `user_auth` document already exists for `provider_type: 'line'` matching that `provider_user_id`
- **THEN** system resolves the associated `userId`, signs the user in, and does not create a new account

### Requirement: LINE ID Token verification

The system SHALL verify the LINE-issued ID Token (JWT) on the server by validating its signature, `aud` (LINE channel id), and `exp` claims before trusting any LINE identity in the token. The system SHALL NOT call LINE's profile API as part of this verification. The verification function SHALL be shared by every LINE login entry point (LIFF, admin Web OAuth, bind/invite flows) rather than duplicated. LINE channels may sign ID Tokens with either HS256 (symmetric, verified with the channel secret) or ES256 (asymmetric, verifiable via LINE's public JWKS); the verification implementation SHALL match the signing algorithm actually used by the configured channel — this project's channel uses HS256.

#### Scenario: Valid LINE ID Token

- **WHEN** any LINE login entry point submits a LINE ID Token to the backend
- **THEN** system verifies the token's signature, `aud`, and `exp`, and extracts the LINE `provider_user_id` from its claims

#### Scenario: Invalid or expired LINE ID Token

- **WHEN** a LINE login entry point submits a LINE ID Token that fails signature, `aud`, or `exp` validation
- **THEN** system rejects the request with an authentication error and does not create or modify any `user`/`user_auth` document

### Requirement: Binding LINE to an existing password-based account requires proof of ownership

The system SHALL require a user with an existing password-based account to authenticate with that account's credentials (obtaining a valid idToken) before the system links a LINE identity to it. The system SHALL NOT bind a LINE identity to an existing account based solely on matching email or phone number. This binding flow SHALL be offered only through the LIFF frontend's account settings; the admin app SHALL NOT offer a "綁定 LINE" entry point.

#### Scenario: Authenticated user binds LINE from account settings

- **WHEN** a user who is signed in with a valid idToken initiates "綁定 LINE" from the LIFF app's account settings and completes LINE Login
- **THEN** system creates a `user_auth` document with `provider_type: 'line'` pointing to the authenticated user's `userId`

#### Scenario: Unauthenticated attempt to bind LINE is rejected

- **WHEN** a request to bind a LINE identity to an existing account is made without a valid idToken proving ownership of that account
- **THEN** system rejects the request and does not create or modify any `user_auth` document

### Requirement: Invite-link activation for accounts never logged in

The system SHALL allow an account created by an administrator that has no login history (only a `user_auth` document with `provider_type: 'password'` and no successful login) to be activated and bound to a LINE identity via a single-use invite link, **provided the account's role is `member`**. The invite token SHALL be stored in Firestore with an `expiresAt` set to 24 hours after issuance and a `usedAt` field, SHALL be rejected once expired, and SHALL be rejected if `usedAt` is already set. The system SHALL NOT generate or accept an invite link for an account whose role is `admin` or `superadmin`, regardless of the requesting operator's permissions — admin-role accounts are internal accounts intended for Username/Password login only and SHALL NOT be bound to a LINE identity.

#### Scenario: Valid, unused invite link activates and binds LINE

- **WHEN** a user opens a valid, unexpired, unused invite link for a member-role account in the LIFF app and completes LINE Login
- **THEN** system marks the invite token's `usedAt`, creates a `user_auth` document with `provider_type: 'line'` for the invited `userId`, and signs the user in

#### Scenario: Expired invite link is rejected

- **WHEN** a user opens an invite link whose `expiresAt` has passed
- **THEN** system rejects the activation and does not modify any `user`/`user_auth` document

#### Scenario: Already-used invite link is rejected

- **WHEN** a user opens an invite link whose `usedAt` is already set
- **THEN** system rejects the activation and does not modify any `user`/`user_auth` document

#### Scenario: Invite-link generation is rejected for admin-role accounts

- **WHEN** an authorized operator (holding `AdminAccounts.Write`) requests a LINE invite link for a target account whose role is `admin` or `superadmin`
- **THEN** system rejects the request without creating an invite token, regardless of the operator's permissions

### Requirement: Invite-link activation detects an already-registered LINE identity

The system SHALL, when a user attempts to activate an invite link by signing in with LINE, check whether a `user_auth` document with `provider_type: 'line'` already exists for that LINE `provider_user_id` pointing to a different `userId` than the invite's target account. If so, the system SHALL NOT bind the LINE identity to the invite's target account. Instead, the system SHALL display a warning ("您已註冊過帳號，將直接登入") and sign the user in to the existing account associated with that `user_auth` document. The invite's target account SHALL remain unmodified and unbound.

#### Scenario: Invite link opened by a user who already self-registered via LINE

- **WHEN** a user opens an invite link in the LIFF app and completes LINE Login, and a `user_auth` document with `provider_type: 'line'` for that `provider_user_id` already points to a different, existing `userId`
- **THEN** system displays a warning dialog stating the user has already registered, signs the user in to the existing account, and leaves the invite's target account unbound and untouched

### Requirement: LINE provider unbinding revokes existing sessions

When a LINE `user_auth` document is created or removed for an account, the system SHALL call Firebase Admin SDK's `revokeRefreshTokens` for the affected Firebase Auth uid(s), invalidating existing idTokens so that subsequent requests require re-authentication and pick up updated custom claims.

#### Scenario: Binding LINE revokes existing sessions

- **WHEN** a LINE `user_auth` document is successfully created for an account
- **THEN** system calls `revokeRefreshTokens` for the account's Firebase Auth uid(s), causing subsequent API requests with the old idToken to fail with 401

### Requirement: `user_auth` document uniqueness

The system SHALL store each `user_auth` document with a Firestore document id composed of `${provider_type}_${provider_user_id}`, guaranteeing at most one `user_auth` document per provider identity without requiring a transaction.

#### Scenario: Duplicate binding attempt is rejected by existing document

- **WHEN** a bind operation attempts to create a `user_auth` document whose computed doc id already exists
- **THEN** system rejects the operation without overwriting the existing document
