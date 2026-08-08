## ADDED Requirements

### Requirement: System defines an independent feature flag for the points module

The system SHALL define a `points` feature flag, controlled by the environment variable `FEATURE_POINTS_ENABLED`. The flag SHALL default to enabled (`true`) when the environment variable is not set, and SHALL be settable independently of the `auditLog` and `loginLog` flags.

#### Scenario: Points flag defaults to enabled

- **WHEN** `FEATURE_POINTS_ENABLED` is not set in the environment
- **THEN** the `points` module behaves as fully enabled

#### Scenario: Points flag disabled does not affect other flags

- **WHEN** `FEATURE_POINTS_ENABLED=false` is set
- **THEN** the `points` module is disabled while `auditLog` and `loginLog` continue to operate according to their own settings

### Requirement: Disabled points module's read and write APIs reject requests

The system SHALL make all `points` module API routes (settings, member balance, ledger, adjustment) reject requests with a "feature disabled" error when the `points` flag is disabled, regardless of the caller's permissions.

#### Scenario: Points adjustment API rejected when disabled

- **WHEN** `points` is disabled and an admin with points-adjustment permission calls the point adjustment API
- **THEN** the server responds with an error indicating the feature is disabled, and no balance or ledger change occurs

#### Scenario: LIFF point balance API rejected when disabled

- **WHEN** `points` is disabled and a member's LIFF client requests their point balance
- **THEN** the server responds with an error indicating the feature is disabled

### Requirement: Disabled points module's navigation and pages are inaccessible on the frontend

The system SHALL hide the points-related navigation items (admin sidebar entry, LIFF member-center entry link) when the `points` flag is disabled, and SHALL redirect direct navigation to points-related pages away from those pages, independent of the user's permissions.

#### Scenario: Admin points nav item hidden when disabled

- **WHEN** `points` is disabled
- **THEN** the points management navigation item does not appear in the admin sidebar for any user

#### Scenario: Direct navigation to a disabled points page is blocked

- **WHEN** `points` is disabled and a user navigates directly to an admin points page or the LIFF point history page via URL
- **THEN** the system redirects away from that page

#### Scenario: Member card and QR page hide point information when disabled

- **WHEN** `points` is disabled
- **THEN** the member card does not display point balance, and the member QR code page does not display point balance or redeemable amount
