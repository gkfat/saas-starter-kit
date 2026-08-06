# Member Number Spec

## Purpose

Provides every member account with a system-generated, unique, immutable member number (`memberNo`), backfilled for pre-existing accounts, and surfaced in the LIFF member card (with QR code) and the admin member views.

## Requirements

### Requirement: Every member has a system-generated, unique, immutable member number

The system SHALL generate a `memberNo` for every account during registration, in the format `M` followed by the registration-time epoch millisecond timestamp and a 2-character random alphanumeric suffix. `memberNo` SHALL be unique across all accounts and SHALL NOT be changeable after creation.

#### Scenario: New account receives a member number at registration

- **WHEN** `registerUserWithProvider()` completes account creation
- **THEN** the system generates a `memberNo` matching the `M<epochMillis><2-char suffix>` format and persists it on the user's record before registration completes

#### Scenario: Generated member number collides with an existing one

- **WHEN** the generated candidate `memberNo` already exists on another account
- **THEN** the system generates a new candidate and retries, without persisting the colliding value

#### Scenario: No API to change an existing member's number

- **WHEN** any client calls the `users` module's public API
- **THEN** no API is available to directly set or change a member's `memberNo` outside of the registration-time generation

### Requirement: Existing accounts without a member number are backfilled

The system SHALL support backfilling `memberNo` for accounts created before this capability existed, using the same generation and uniqueness rules as registration-time generation.

#### Scenario: Backfilling a pre-existing account

- **WHEN** an account has no `memberNo` value
- **THEN** the backfill process generates and persists a unique `memberNo` for that account, following the same format and uniqueness guarantee as registration-time generation

### Requirement: LIFF member card displays the member number and a scannable QR code

The system SHALL display the logged-in member's `memberNo` on the LIFF member card (home page), together with a QR code whose content is the `memberNo` string, so a store can scan it to identify the member.

#### Scenario: Member views their card

- **WHEN** a logged-in member views the LIFF home page
- **THEN** the member card displays their `memberNo` as text and renders a QR code encoding that same `memberNo`

### Requirement: Admin member views display the member number

The system SHALL display `memberNo` in the admin members list and in the member detail view.

#### Scenario: Admin views the members list

- **WHEN** an authorized admin loads `/admin/members`
- **THEN** each row displays that member's `memberNo`

#### Scenario: Admin views a member's detail

- **WHEN** an authorized admin opens a member's detail view
- **THEN** the detail view displays that member's `memberNo`
