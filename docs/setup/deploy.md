# Deployment Setup

Three independently deployed apps, one Firebase/GCP project:

- `apps/server` → Cloud Run (see `apps/server/Dockerfile`, `apps/server/service.yaml`)
- `apps/admin`, `apps/liff` → Firebase Hosting, two separate Hosting targets (see `firebase.json`, `.firebaserc`)

## Placeholders to replace before first deploy

`.firebaserc` and `apps/server/service.yaml` contain placeholder values — this repo has no real
Firebase/GCP project wired up yet. Replace:

| Placeholder                       | File                       | Replace with                                          |
| --------------------------------- | -------------------------- | ----------------------------------------------------- |
| `PLACEHOLDER_FIREBASE_PROJECT_ID` | `.firebaserc`              | Real Firebase project ID                              |
| `PLACEHOLDER_ADMIN_SITE_ID`       | `.firebaserc`              | Firebase Hosting site ID created for `apps/admin`     |
| `PLACEHOLDER_LIFF_SITE_ID`        | `.firebaserc`              | Firebase Hosting site ID created for `apps/liff`      |
| `IMAGE_URL_PLACEHOLDER`           | `apps/server/service.yaml` | Built image URL (Artifact Registry), after first push |

Creating the two Hosting sites (one-time, via Firebase Console or CLI):

```bash
firebase hosting:sites:create <admin-site-id> --project <project-id>
firebase hosting:sites:create <liff-site-id> --project <project-id>
```

## Env vars that must point at the real deployed URLs

- `apps/server`: `CORS_ALLOWED_ORIGINS` — comma-separated list of the deployed `apps/admin` and
  `apps/liff` Hosting URLs (see `.env.example`)
- `apps/admin`, `apps/liff`: `API_BASE_URL` — the deployed Cloud Run URL of `apps/server`

These are read at build time (see `apps/admin/nuxt.config.ts` `runtimeConfig.public.apiBaseUrl`,
`apps/liff/vite.config.ts`), so each app must be rebuilt after the Cloud Run URL is known.

## Deploy commands

```bash
# apps/server → Cloud Run
docker build -f apps/server/Dockerfile -t <IMAGE_URL> .
docker push <IMAGE_URL>
gcloud run services replace apps/server/service.yaml --region=<REGION> --project=<PROJECT_ID>

# apps/admin, apps/liff → Firebase Hosting
pnpm --dir apps/admin generate
pnpm --dir apps/liff build
firebase deploy --only hosting:admin,hosting:liff --project <PROJECT_ID>
```

Secrets (`FIREBASE_PRIVATE_KEY`, etc.) SHALL be provided to Cloud Run via
`gcloud run services update --set-secrets` / Secret Manager — never committed to
`apps/server/service.yaml`.

## CI/CD (GitHub Actions)

`.github/workflows/deploy.yml` builds/tests on every push and PR to `main`, then — on push to
`main` only — deploys just the apps affected by the changed paths (`scripts/detect-affected-apps.ts`;
a change under `packages/shared` is treated as affecting all three apps).

Required repo secrets (Settings → Secrets and variables → Actions), none of which exist yet:

| Secret                           | Used for                                             |
| -------------------------------- | ---------------------------------------------------- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `apps/server` → Cloud Run deploy (Workload Identity) |
| `GCP_SERVICE_ACCOUNT`            | `apps/server` → Cloud Run deploy                     |
| `GCP_PROJECT_ID`                 | `apps/server` → Cloud Run deploy                     |
| `GCP_REGION`                     | `apps/server` → Cloud Run deploy                     |
| `GCP_ARTIFACT_REPO`              | `apps/server` → Artifact Registry repo name          |
| `FIREBASE_SERVICE_ACCOUNT`       | `apps/admin`, `apps/liff` → Firebase Hosting deploy  |
| `SERVER_URL`                     | `apps/admin`, `apps/liff` build → `API_BASE_URL`     |
