## ADDED Requirements

### Requirement: Level module is decoupled from metric source and from the points module

The system SHALL provide a `level` module whose public API accepts metric values through a source-agnostic interface, without depending on the `points` module or any specific Firestore data of other modules. Cross-module communication SHALL use primitives only (e.g. `userId: string`).

#### Scenario: Level module has no dependency on points module

- **WHEN** the `level` module records or evaluates a member's metric
- **THEN** it does not read or write any `points` module Firestore collection, and does not import from any module other than through that module's `index.ts`

#### Scenario: Metric value is recorded without assuming its meaning

- **WHEN** an external caller invokes `recordMetric(userId, amount, reason, source, refId)`
- **THEN** the system stores the entry without validating or interpreting what the metric represents

### Requirement: Each member has an independent, per-member evaluation period anchored to their join date

The system SHALL maintain a fixed evaluation period per member, with `startDate` initialized to the member's `createdAt` and `endDate` one period length later, independent of any global calendar cycle.

#### Scenario: New member gets a period anchored to signup date

- **WHEN** a member is first registered in the `level` module
- **THEN** the system creates a current period with `startDate` equal to the member's `createdAt` and `endDate` one period length later

#### Scenario: Period boundaries are independent across members

- **WHEN** two members join on different dates
- **THEN** their `endDate` values differ accordingly and are evaluated independently

### Requirement: Accumulated metric resets to zero at period boundary

The system SHALL reset a member's current-period accumulated metric value to zero when their period ends, and SHALL start a new period immediately following the prior `endDate`.

#### Scenario: Period ends with no carryover

- **WHEN** a member's `endDate` is reached and the due-period evaluation batch processes them
- **THEN** the system records the final evaluation for that period, resets the accumulated metric to zero, and opens a new period starting immediately after the previous `endDate`

### Requirement: Level upgrades apply immediately; downgrades apply only at period end

The system SHALL apply a level upgrade as soon as the accumulated metric within the current period crosses a higher tier's threshold. The system SHALL NOT apply a downgrade mid-period; downgrades SHALL only be determined during the period-end evaluation.

#### Scenario: Mid-period metric crosses a higher tier threshold

- **WHEN** a `recordMetric` call causes the current-period accumulated value to cross a higher tier's threshold
- **THEN** the member's active level is updated to the higher tier immediately, without waiting for period end

#### Scenario: Mid-period accumulated value is below current tier's threshold

- **WHEN** the current-period accumulated value has not yet reached the member's current active tier's threshold
- **THEN** the member's active level remains unchanged until the period-end evaluation

#### Scenario: Mid-period upgrade does not shift period boundaries

- **WHEN** a mid-period upgrade occurs
- **THEN** the member's `startDate` and `endDate` remain unchanged

### Requirement: Metric changes are recorded as an immutable ledger with a denormalized running total

The system SHALL persist every metric change as an immutable ledger entry (`amount`, `reason`, `source`, `refId`, `occurredAt`) and SHALL maintain a denormalized current-period total for read efficiency. The ledger SHALL be the source of truth.

#### Scenario: Metric entry is persisted

- **WHEN** `recordMetric` is called
- **THEN** the system writes a ledger entry with the provided fields and updates the denormalized current-period total within the same transaction

### Requirement: Tier thresholds are configurable via Firestore-backed admin UI

The system SHALL store tier definitions (level number, name, metric threshold) in Firestore and SHALL provide an admin UI to create, update, and delete tier definitions.

#### Scenario: Admin updates a tier threshold

- **WHEN** an authorized admin changes a tier's threshold via the admin UI
- **THEN** the system persists the change and subsequent evaluations use the updated threshold

#### Scenario: Lowest tier is level number 1 with a zero metric threshold

- **WHEN** tier definitions are created or validated
- **THEN** the system enforces that the tier with `levelNumber = 1` has a metric threshold of `0`, and every member always resolves to a valid tier (never `null`)

### Requirement: Period-end evaluation snapshots the tier table used

The system SHALL, at each period-end evaluation, persist a `level_history` record containing the evaluation result together with a snapshot of the tier table used at that time, so later changes to tier definitions do not alter historical records. The recorded level SHALL be taken directly from the member's current `currentLevelNumber` (already maintained by immediate-upgrade handling), not recomputed from `currentPeriodTotal`.

#### Scenario: Tier table changes after a historical evaluation

- **WHEN** an admin changes tier thresholds after a member's period-end evaluation has already been recorded
- **THEN** the previously recorded `level_history` entry's tier snapshot remains unchanged

### Requirement: Period-end evaluation is triggered by an authenticated internal endpoint, idempotent by construction

The system SHALL expose a protected internal API endpoint that performs period-end evaluation for all members whose `endDate` has passed, authenticated via a shared-secret header. The evaluation, period update, and metric reset for each member SHALL be performed atomically within a single Firestore transaction, and SHALL be idempotent under repeated invocation.

#### Scenario: Scheduler triggers due evaluations

- **WHEN** the internal endpoint is called with a valid shared secret
- **THEN** the system queries all members whose `endDate <= now`, and for each, atomically writes the `level_history` record, resets the accumulated metric, and advances `startDate`/`endDate` to the next period

#### Scenario: Endpoint called without valid shared secret

- **WHEN** the internal endpoint is called without a valid shared secret
- **THEN** the system rejects the request and performs no evaluation

#### Scenario: Duplicate invocation on the same day

- **WHEN** the internal endpoint is invoked twice in succession (e.g. due to scheduler retry)
- **THEN** members already processed no longer match the `endDate <= now` condition and are not evaluated a second time

#### Scenario: Partial failure during evaluation does not leave inconsistent state

- **WHEN** an error occurs while processing a member's period-end evaluation
- **THEN** the transaction for that member is rolled back entirely, leaving neither a partial `level_history` record nor a partially updated period state

### Requirement: Manual level override is not supported

The system SHALL NOT provide a mechanism for administrators to directly set a member's level outside of metric-driven evaluation.

#### Scenario: Admin attempts to set a level directly

- **WHEN** any client calls the `level` module's public API
- **THEN** no API is available to set a member's level independent of `recordMetric` and the evaluation process

### Requirement: Member period is initialized synchronously at registration, unconditionally of the feature flag

The system SHALL initialize a member's level period state during registration, via an explicit call from the `users` module's registration flow to the `level` module's `initializeMemberPeriod(userId, createdAt)`. This call SHALL run regardless of the `level` module's feature flag state, so that every member always has period state and no backfill is ever required when the flag is later enabled. If initialization fails, registration SHALL fail and the error SHALL propagate to the caller.

#### Scenario: Registration always initializes level state

- **WHEN** a new member completes registration, regardless of `FEATURE_LEVEL_ENABLED`
- **THEN** the system creates the member's initial period state anchored to their `createdAt` before registration completes

#### Scenario: Level initialization failure fails registration

- **WHEN** `initializeMemberPeriod` fails during registration
- **THEN** the registration API call fails and returns an error

### Requirement: Metric amounts must be non-negative

The system SHALL reject `recordMetric` calls with a negative `amount`, since the immediate-upgrade/period-end-only-downgrade model depends on the accumulated metric being monotonically non-decreasing within a period.

#### Scenario: Negative amount is rejected

- **WHEN** `recordMetric` is called with a negative `amount`
- **THEN** the system rejects the request without writing a ledger entry or updating the accumulated total

### Requirement: Tier deletion is blocked when referenced by a member's current level

The system SHALL reject deletion of a tier when any member's current period state has `currentLevelNumber` equal to that tier's `levelNumber`.

#### Scenario: Deleting a tier in active use

- **WHEN** an admin attempts to delete a tier that at least one member currently holds as their active level
- **THEN** the system rejects the deletion with an explicit error and the tier remains unchanged

#### Scenario: Deleting an unused tier

- **WHEN** an admin deletes a tier that no member currently holds as their active level
- **THEN** the system deletes the tier

### Requirement: Due-period evaluation is paginated and isolates per-member failures

The system SHALL query due members (`endDate <= now`) in pages, looping within a single invocation until all due members have been processed. A failure while processing one member SHALL be logged and SHALL NOT prevent evaluation of other due members in the same invocation.

#### Scenario: More due members than one page

- **WHEN** the number of members with `endDate <= now` exceeds one page
- **THEN** the system continues querying and processing subsequent pages within the same invocation until no due members remain

#### Scenario: One member's evaluation fails

- **WHEN** processing a specific due member raises an error
- **THEN** the system logs the failure and continues evaluating the remaining due members instead of aborting the whole invocation

### Requirement: Level module is gated by a feature flag

The system SHALL gate both the backend API (`recordMetric`, `getLevel`, the due-period evaluation endpoint) and the admin frontend UI of the `level` module behind a single feature flag, consistent with the existing feature-flag mechanism. `initializeMemberPeriod` is excluded from this gate and always runs at registration (see the period-initialization requirement above).

#### Scenario: Feature flag disabled

- **WHEN** the `level` module feature flag is disabled
- **THEN** the `level` module's API endpoints reject requests and the admin UI does not display level management pages

#### Scenario: Feature flag enabled

- **WHEN** the `level` module feature flag is enabled
- **THEN** the `level` module's API endpoints and admin UI function as specified
