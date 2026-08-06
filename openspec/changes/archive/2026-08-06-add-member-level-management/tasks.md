## 1. Module scaffolding

- [x] 1.1 Create `apps/server/server/modules/level/` with `level.types.ts`, `level.schema.ts`, `level.service.ts`, `level.repo.ts`, `index.ts` following existing module structure (e.g. `modules/logs`)
- [x] 1.2 Define `level` module types: `LevelTier`, `MemberLevelState` (current period), `LevelMetricEntry` (ledger), `LevelHistoryEntry` (with tier snapshot)
- [x] 1.3 Add feature flag `FEATURE_LEVEL_ENABLED` following the existing `FEATURE_AUDIT_LOG_ENABLED`/`FEATURE_LOGIN_LOG_ENABLED` pattern (env var, defaults to enabled, exposed via `runtimeConfig.public`)
- [x] 1.4 Wire `apps/server/server/modules/users/users.service.ts` `registerUserWithProvider()` to call `level.initializeMemberPeriod(userId, createdAt)` (via `level/index.ts`) after `assignUserRole`, following the same direct-call pattern already used for `bindProvider`/`assignUserRole`; this call SHALL run unconditionally (NOT gated by `FEATURE_LEVEL_ENABLED` — only `recordMetric`/`evaluateDuePeriods`/admin UI are feature-flag gated, to avoid a backfill gap for members registered while the flag was off); if it fails, `registerUserWithProvider` SHALL propagate the error (matching existing `assignUserRole` failure behavior — see `docs/known-issues.md` for the pre-existing non-atomicity this shares)

## 2. Firestore data model

- [x] 2.1 Design and implement `level_tiers` collection repo functions (list, create, update, delete) with `levelNumber`, `name`, `metricThreshold`
- [x] 2.2 Add validation ensuring the tier with `levelNumber = 1` always has `metricThreshold = 0`, and `levelNumber`/`metricThreshold` are unique and monotonically increasing across tiers
- [x] 2.2a Add tier-deletion reference-integrity check: before deleting a tier, query whether any member's current period state has `currentLevelNumber` equal to that tier's `levelNumber`; reject the deletion with an explicit error if so
- [x] 2.3 Design and implement per-member current period state (`startDate`, `endDate`, `currentPeriodTotal`, `currentLevelNumber`) repo functions
- [x] 2.4 Design and implement `level_metric_entries` ledger repo functions (append-only write, query by member/period)
- [x] 2.5 Design and implement `level_history` repo functions (append period-end evaluation result with tier snapshot)
- [x] 2.6 Add Firestore index for querying members by `endDate` (due-period lookup) — single-field range/order query on `endDate` is auto-indexed by Firestore by default; repo has no `firestore.indexes.json` infra in this project, so no config file is needed

## 3. Core service logic

- [x] 3.1 Implement `initializeMemberPeriod(userId, joinedAt)` — creates first period anchored to `createdAt`
- [x] 3.2 Implement `recordMetric(userId, amount, reason, source, refId)` — writes ledger entry + updates denormalized `currentPeriodTotal` in one transaction; validate `amount >= 0` via Zod in `level.schema.ts`, rejecting negative values (required for the monotonic-increase assumption behind immediate-upgrade/period-end-only-downgrade)
- [x] 3.3 Implement immediate-upgrade check within `recordMetric` — compares updated `currentPeriodTotal` against tier thresholds and updates `currentLevelNumber` upward only, without altering `startDate`/`endDate`
- [x] 3.4 Implement `getLevel(userId)` — returns current level number, tier name, and current period info
- [x] 3.5 Implement `evaluateDuePeriods(now)` — queries members with `endDate <= now` in pages of 100 (ordered by `endDate` ascending), looping within the same invocation until no due members remain; for each member, atomically: writes `level_history` (with tier snapshot and final level taken directly from the member's current `currentLevelNumber`, not recomputed from `currentPeriodTotal`), resets `currentPeriodTotal` to 0, advances `startDate`/`endDate` to the next period
- [x] 3.6 Ensure `evaluateDuePeriods` is naturally idempotent (processed members no longer match the query condition) and each member's update is wrapped in a single Firestore transaction
- [x] 3.7 Isolate per-member failures within `evaluateDuePeriods`: wrap each member's processing in try/catch so a single failure is logged (structured log, matching existing API log conventions — `userId` + error reason, not written to Firestore) and the loop continues to the next member rather than aborting the whole batch (avoids a poison-pill record blocking all members queued behind it); return a summary `{ processed, failed, failedUserIds }` from the endpoint

## 4. Internal batch evaluation endpoint

- [x] 4.1 Add shared-secret environment variable (e.g. `LEVEL_BATCH_SECRET`) and validation middleware/util for the internal endpoint
- [x] 4.2 Implement `POST /api/internal/level/evaluate-due-periods` — thin handler validating shared secret, gated by `FEATURE_LEVEL_ENABLED`, calling `level.service.evaluateDuePeriods()`
- [x] 4.3 Reject requests with missing/invalid shared secret with an explicit auth error
- [x] 4.4 Document GCP Cloud Scheduler setup (target endpoint, header injection, schedule) in a README or deployment note

## 5. Admin UI — tier management

- [x] 5.1 Add DTOs in `level.schema.ts` for tier list/create/update/delete requests and responses (Zod)
- [x] 5.2 Implement admin-facing tier CRUD API endpoints under `api/admin/level/tiers` (thin handlers → service)
- [x] 5.3 Add admin page for listing/creating/editing/deleting tiers under `apps/admin/pages/admin/`
- [x] 5.4 Gate the admin nav item and page behind `FEATURE_LEVEL_ENABLED`, following the existing pattern used for `auditLog`/`loginLog` nav items
- [x] 5.5 Add client-side validation mirroring the `levelNumber = 1` → `metricThreshold = 0` rule, with server-side as source of truth

## 6. Admin UI — member level visibility

- [x] 6.1 Add `getLevelsForUsers(userIds)` (or equivalent whole-collection read, matching `listUsers()`'s no-pagination pattern) to `level.repo.ts`/`level.service.ts`, exposed via `level/index.ts`
- [x] 6.2 Add `GET /api/profile/level` — thin handler returning the logged-in user's own level info via `level.getLevel(userId)`; gated by `FEATURE_LEVEL_ENABLED`
- [x] 6.3 Add `GET /api/admin/users/[id]` — new single-member detail endpoint merging existing user fields with `level.getLevel(userId)` (level fields omitted/absent when flag disabled)
- [x] 6.4 Extend `GET /api/admin/users` (list) handler to merge `level.getLevelsForUsers()` results into the response DTO by `userId`; composition happens in the API handler layer, not inside `users.service.ts` (keeps `users`/`level` modules decoupled — neither service imports the other)
- [x] 6.5 Add `LevelCard.vue` (profile page) — displays level name, `levelNumber`, current period accumulated metric, `startDate`/`endDate`; entire card hidden when `FEATURE_LEVEL_ENABLED=false`; add to `apps/admin/pages/profile/index.vue`
- [x] 6.6 Add "等級" column to `UsersTable.vue` (members list), sourced from the extended list response; column hidden when flag disabled — also gated off entirely for the admin-accounts listing via a new `showMemberFeatures` prop, since level doesn't apply to staff accounts
- [x] 6.7 Add `mdi-information-outline` detail icon action to `UsersTable.vue`, emitting `detail`; add `MemberDetailDialog.vue` (read-only) showing full member fields plus a reused `LevelCard.vue` (parameterized by `userId`), fetched from `GET /api/admin/users/[id]`
- [x] 6.8 Wire `MemberDetailDialog` into `apps/admin/pages/admin/members/index.vue` alongside existing dialogs

## 7. Feature flag integration verification

- [x] 7.1 Verify `recordMetric`/`getLevel`/batch endpoint reject or no-op appropriately when `FEATURE_LEVEL_ENABLED=false`, and that `initializeMemberPeriod` still runs unconditionally (unaffected by the flag) so registration always creates period state
- [x] 7.2 Verify admin nav item and pages are hidden/redirected when flag disabled
- [x] 7.3 Verify profile level card, members-list level column, and member detail dialog's level section are all hidden/omitted when flag disabled

## 8. Tests

- [ ] 8.1 Unit/integration tests for `recordMetric` immediate-upgrade behavior (crosses threshold mid-period) — **known gap**: this change intentionally exposes no HTTP endpoint for `recordMetric` (metric integration is a Non-Goal), and the existing test suite is HTTP-only integration tests (no auto-import shim for `useRuntimeConfig` in vitest), so there is no reachable entry point to test this from outside the module. Confirmed with the user (2026-08-05); defer to the future change that wires up a real metric caller.
- [ ] 8.2 Tests confirming downgrade never happens mid-period, only at period-end evaluation — same gap as 8.1 (depends on `recordMetric`)
- [x] 8.3 Tests for `evaluateDuePeriods` idempotency (invoked twice, second call is a no-op for already-processed members)
- [x] 8.4 Tests for transactional atomicity (simulated failure mid-evaluation leaves no partial state) — verified via the poison-pill member in 8.12's test: its state doc is provably untouched after a failed transaction
- [x] 8.5 Tests for tier validation rule (`levelNumber = 1` must have `metricThreshold = 0`)
- [x] 8.6 Tests for internal endpoint auth (missing/invalid shared secret rejected)
- [x] 8.7 Tests confirming `level_history` snapshot is unaffected by later tier table changes
- [ ] 8.8 Tests confirming `recordMetric` rejects negative `amount` — same gap as 8.1 (depends on `recordMetric`)
- [x] 8.9 Tests confirming tier deletion is rejected when a member's `currentLevelNumber` references it, and succeeds when no member references it
- [~] 8.10 Tests confirming `registerUserWithProvider` propagates an error when `level.initializeMemberPeriod` fails, and no-ops when `FEATURE_LEVEL_ENABLED=false` — only the unconditional-execution half is covered (register → `level_member_states` exists regardless of flag); the failure-propagation half has no black-box way to force `initializeMemberPeriod` to fail via HTTP, same class of gap as 8.1
- [x] 8.11 Tests confirming `evaluateDuePeriods` pages through more than 100 due members within a single invocation and processes all of them — **this test surfaced and fixed a real bug**: the original `queryDuePeriodsPage`/`evaluateDuePeriods` re-queried `endDate <= now` from scratch every loop iteration, so a permanently-failing member (never leaves the due set) caused an infinite retry loop instead of terminating; fixed by switching to Firestore cursor-based pagination (`startAfter`) so pages advance monotonically regardless of per-member success/failure
- [x] 8.12 Tests confirming a single member's processing failure during `evaluateDuePeriods` does not block evaluation of subsequent due members
- [x] 8.13 Tests for `GET /api/admin/users` list and `GET /api/admin/users/[id]` detail endpoints returning correct level info

## 9. Documentation

- [x] 9.1 Update `CLAUDE.md` implementation phases / module list to reflect the new `level` module
- [x] 9.2 Add module-level notes on the points/level decoupling boundary for future contributors
- [x] 9.3 Reference `docs/known-issues.md` (registration non-atomicity) from the `level` module's registration integration point, noting it as a pre-existing limitation this change does not fix
