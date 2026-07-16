## ADDED Requirements

### Requirement: System defines independent feature flags for auditLog and loginLog modules

The system SHALL define two independent feature flags, `auditLog` and `loginLog`, controlled by environment variables (`FEATURE_AUDIT_LOG_ENABLED`, `FEATURE_LOGIN_LOG_ENABLED`). Each flag SHALL default to enabled (`true`) when its environment variable is not set. The two flags SHALL be settable independently of one another.

#### Scenario: Flags default to enabled

- **WHEN** neither `FEATURE_AUDIT_LOG_ENABLED` nor `FEATURE_LOGIN_LOG_ENABLED` is set in the environment
- **THEN** both `auditLog` and `loginLog` modules behave as fully enabled

#### Scenario: One flag disabled does not affect the other

- **WHEN** `FEATURE_AUDIT_LOG_ENABLED=false` is set and `FEATURE_LOGIN_LOG_ENABLED` is unset (or `true`)
- **THEN** the `auditLog` module is disabled while the `loginLog` module continues to operate normally

### Requirement: Disabling a module does not break other application functionality

The system SHALL treat log-writing calls for a disabled module as no-ops that do not raise errors, so that operations which trigger those writes (e.g. assigning a user role, permission changes, login) complete successfully regardless of the flag's state.

#### Scenario: Assigning a user role succeeds with auditLog disabled

- **WHEN** `auditLog` is disabled and an admin changes a user's role via `PATCH /api/admin/users/:id`
- **THEN** the role assignment succeeds and no audit log entry is written, and the request does not fail or error because of the disabled flag

#### Scenario: Login succeeds with loginLog disabled

- **WHEN** `loginLog` is disabled and a user logs in
- **THEN** the login completes successfully and no login log entry is written, and the login flow does not fail or error because of the disabled flag

### Requirement: Disabled module's read API rejects requests regardless of permission

The system SHALL make the read endpoints for a disabled module (`GET /api/admin/logs/audit` for `auditLog`, `GET /api/admin/logs/login` for `loginLog`) reject all requests with a "feature disabled" error, even when the caller holds the corresponding read permission (`audit_logs:read`, `login_logs:read`).

#### Scenario: Audit log API rejected when auditLog disabled

- **WHEN** `auditLog` is disabled and a user with `audit_logs:read` permission calls `GET /api/admin/logs/audit`
- **THEN** the server responds with an error indicating the feature is disabled, not the list of audit logs

#### Scenario: Login log API rejected when loginLog disabled

- **WHEN** `loginLog` is disabled and a user with `login_logs:read` permission calls `GET /api/admin/logs/login`
- **THEN** the server responds with an error indicating the feature is disabled, not the list of login logs

### Requirement: Disabled module's navigation and page are inaccessible on the frontend

The system SHALL hide the navigation item for a disabled module from the sidebar and SHALL redirect any direct navigation to its page away (to `/dashboard`), independent of the user's permissions.

#### Scenario: Audit logs nav item hidden when auditLog disabled

- **WHEN** `auditLog` is disabled
- **THEN** the "稽核紀錄" navigation item does not appear in the sidebar for any user, including users who hold `audit_logs:read`

#### Scenario: Direct navigation to a disabled module's page is blocked

- **WHEN** `loginLog` is disabled and a logged-in user navigates directly to `/admin/logs/login` via URL
- **THEN** the client route guard redirects the user to `/dashboard` without rendering the page

### Requirement: Feature flag configuration is shared consistently between server and client

The system SHALL expose the same feature flag values to both server-side request handling and client-side rendering from a single configuration source, so that a flag's enabled/disabled state cannot differ between the two.

#### Scenario: Flag value consistent across server and client

- **WHEN** `FEATURE_AUDIT_LOG_ENABLED=false` is set for a deployment
- **THEN** both the server API rejection behavior and the client navigation/page-hiding behavior reflect `auditLog` as disabled
