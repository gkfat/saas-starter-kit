## MODIFIED Requirements

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
