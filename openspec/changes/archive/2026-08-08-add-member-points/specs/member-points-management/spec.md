## ADDED Requirements

### Requirement: Points module is decoupled from other modules

The system SHALL provide a `points` module whose public API is exposed only through its `index.ts`, and which does not read or write Firestore data belonging to any other module (`level`, `users`, `coupons`). Cross-module communication SHALL use primitives only (e.g. `userId: string`).

#### Scenario: Points module has no dependency on level or users module data

- **WHEN** the `points` module records or reads a member's point balance or ledger
- **THEN** it does not read or write any `level` or `users` module Firestore collection, and does not import from any module other than through that module's `index.ts`

### Requirement: Global redemption ratio is configurable via admin UI

The system SHALL store a single global redemption ratio (`pointsPerUnit`, `currencyValue`) in Firestore and SHALL provide an admin settings page to view and update it. The redeemable amount SHALL be calculated as `floor(points / pointsPerUnit) * currencyValue`.

#### Scenario: Admin updates the redemption ratio

- **WHEN** an authorized admin sets `pointsPerUnit = 10` and `currencyValue = 1` via the settings page
- **THEN** the system persists the new ratio and subsequent redeemable-amount calculations use the updated values

#### Scenario: Redeemable amount rounds down to whole currency units

- **WHEN** the ratio is `pointsPerUnit = 10`, `currencyValue = 1`, and a member holds `125` points
- **THEN** the calculated redeemable amount is `12` (not `12.5`)

### Requirement: Admin can manually adjust a member's point balance

The system SHALL allow an authorized admin to increase or decrease a member's point balance through an admin UI, requiring a selected reason and, when the reason is "其他", a mandatory free-text note.

#### Scenario: Admin grants points with a predefined reason

- **WHEN** an authorized admin submits a positive point adjustment for a member with reason `消費回饋`
- **THEN** the system increases the member's balance by the given amount and records a ledger entry with that reason

#### Scenario: Admin selects "其他" reason without a note

- **WHEN** an authorized admin selects reason `其他` and submits without filling in the note field
- **THEN** the system rejects the submission and requires the note field to be filled

#### Scenario: Admin selects "其他" reason with a note

- **WHEN** an authorized admin selects reason `其他`, fills in a free-text note, and submits
- **THEN** the system records the adjustment with reason `其他` and the provided note

### Requirement: Point balance cannot become negative

The system SHALL reject any point deduction that would cause a member's balance to fall below zero.

#### Scenario: Deduction within balance succeeds

- **WHEN** a member has a balance of `100` points and an admin submits a deduction of `50` points
- **THEN** the system applies the deduction and the resulting balance is `50`

#### Scenario: Deduction exceeding balance is rejected

- **WHEN** a member has a balance of `30` points and an admin submits a deduction of `50` points
- **THEN** the system rejects the adjustment with an error and the member's balance remains unchanged at `30`

### Requirement: Point balance changes are recorded as an immutable ledger

The system SHALL persist every point balance change as an immutable ledger entry (`amount`, `reason`, `reasonNote?`, `balanceAfter`, `createdAt`, `createdBy`) and SHALL apply the balance update in the same atomic transaction as the ledger write.

#### Scenario: Ledger entry is written atomically with balance update

- **WHEN** an admin's point adjustment is submitted
- **THEN** the system writes a ledger entry and updates the denormalized balance within the same Firestore transaction, so both succeed or both fail together

### Requirement: Admin can view a member's point ledger

The system SHALL provide an admin UI to view a specific member's current point balance and their full point adjustment ledger, ordered by most recent first.

#### Scenario: Admin opens a member's point detail

- **WHEN** an authorized admin selects a member from the points member list
- **THEN** the system displays the member's current balance and a list of their ledger entries ordered from most recent to oldest
