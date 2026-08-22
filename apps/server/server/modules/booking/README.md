# booking module

Member booking module. See `openspec/changes/booking-module/design.md` for the full design
rationale.

## Overdue pending-review batch

`POST /api/internal/booking/process-overdue-bookings` auto-rejects any `pendingReview`
booking whose time slot has already started (`reviewDeadlineAt <= now`, where
`reviewDeadlineAt` is set at booking creation to the time slot's `startAt`), releasing that
slot's `pendingCount`. It is idempotent — a booking already rejected no longer matches the
`status == pendingReview` query.

This endpoint has no scheduler built into the app (no Nitro `scheduledTasks`, no cron
package) — it must be triggered externally, the same way as
`apps/server/server/modules/level/README.md`'s due-period batch.

### GCP Cloud Scheduler setup

1. Create a Cloud Scheduler job targeting `POST https://<server-host>/api/internal/booking/process-overdue-bookings`.
2. Add a header `X-Booking-Batch-Secret: <value of BOOKING_BATCH_SECRET>` to the job's HTTP target config.
3. Set a schedule frequent enough that overdue bookings are cleared promptly (e.g. hourly) —
   until the batch runs, an overdue booking still counts against its slot's `pendingCount`.
4. Set `BOOKING_BATCH_SECRET` in the server's deployment environment to a random,
   sufficiently long string (treat it like a service-account credential — see `.env.example`).

The endpoint is also gated by `FEATURE_BOOKING_ENABLED`; if the flag is disabled it responds
`404`.

## LINE notification

`booking.notifier.ts` defines the `LineNotifier` interface booking status changes call into
(design.md D4). Channel credential management and message content/timing are unresolved
(see proposal.md Open Questions), so the only implementation currently registered is a
log-only stub — notifications are silently skipped until a real implementation replaces
`defaultNotifier`. This does not block booking creation/review/cancellation, which do not
depend on notification delivery succeeding.
