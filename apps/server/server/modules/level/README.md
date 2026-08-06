# level module

Member level (tier) module. See `openspec/changes/add-member-level-management/design.md` for
the full design rationale. `level` is fully decoupled from the `points` module — no shared
Firestore data, no cross-imports; both communicate with other modules only through
`userId: string` primitives.

## Due-period evaluation batch

`POST /api/internal/level/evaluate-due-periods` finalizes any member whose evaluation
period has ended (`endDate <= now`): it snapshots the tier table into `level_history`,
resets the accumulated metric, and opens the member's next period. It is idempotent —
repeated calls are safe, since a processed member no longer matches the `endDate <= now`
query.

This endpoint has no scheduler built into the app (no Nitro `scheduledTasks`, no cron
package) — it must be triggered externally.

### GCP Cloud Scheduler setup

1. Create a Cloud Scheduler job targeting `POST https://<server-host>/api/internal/level/evaluate-due-periods`.
2. Add a header `X-Level-Batch-Secret: <value of LEVEL_BATCH_SECRET>` to the job's HTTP target config.
3. Set a schedule that runs at least once a day (e.g. `0 3 * * *` for 03:00 daily) — due
   members accumulate until the batch runs, so more frequent runs reduce the delay between
   a member's `endDate` and their period-end evaluation actually being recorded.
4. Set `LEVEL_BATCH_SECRET` in the server's deployment environment to a random, sufficiently
   long string (treat it like a service-account credential — see `.env.example`).

The endpoint is also gated by `FEATURE_LEVEL_ENABLED`; if the flag is disabled it responds
`404`.
