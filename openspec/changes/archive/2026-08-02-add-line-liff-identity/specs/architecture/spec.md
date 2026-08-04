## ADDED Requirements

### Requirement: `RequestContext.userId` refers to internal user_id, not raw Firebase uid

The system SHALL populate `RequestContext.userId` with the internal `userId` maintained by `modules/identity`, delivered via a custom claim on the verified Firebase ID Token, rather than the raw Firebase Auth uid. This SHALL replace the prior behavior where `userId` was the Firebase Auth uid directly.

#### Scenario: Protected route reads internal user_id

- **WHEN** `03.auth.ts` verifies a Firebase ID Token that carries an internal `userId` custom claim
- **THEN** system sets `event.context.userId` to the value of that claim, not the token's raw Firebase uid

#### Scenario: Token without internal user_id claim during migration window

- **WHEN** `03.auth.ts` verifies a Firebase ID Token that does not carry an internal `userId` custom claim (pre-migration token)
- **THEN** system falls back to using the Firebase uid as `event.context.userId`, consistent with the migration plan's compatibility window

### Requirement: `modules/identity` owns user ↔ user_auth resolution

The system SHALL introduce `modules/identity` as the module responsible for resolving the mapping between a `user` and its one or more `user_auth` provider records, for provider binding/unbinding, and for invite-token issuance/validation. `modules/auth` SHALL be limited to token verification and custom token issuance; `modules/users` SHALL be limited to member profile attributes. Cross-module access SHALL go through each module's `index.ts`, consistent with existing module boundary rules.

#### Scenario: `modules/auth` delegates provider resolution to `modules/identity`

- **WHEN** `modules/auth` needs to resolve which internal `userId` a verified provider identity belongs to
- **THEN** it calls `modules/identity`'s public `index.ts` interface rather than querying `user_auth` data directly
