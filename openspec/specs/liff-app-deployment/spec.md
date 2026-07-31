# LIFF App Deployment Spec

## Purpose

Defines how the project is restructured into a pnpm workspace monorepo (`apps/server`, `apps/admin`, `apps/liff`, `packages/shared`) and how each app is built, deployed, and tested independently — covering Cloud Run deployment for the API server, Firebase Hosting targets for the two frontend apps, cross-origin access between them, CI/CD scoping by changed paths, and local HTTPS tunneling for LIFF testing inside the LINE app.

## Requirements

### Requirement: Project is restructured as a pnpm workspace monorepo

The system SHALL restructure the project from a single Nuxt application into a pnpm workspace monorepo with three apps (`apps/server`, `apps/admin`, `apps/liff`) and one shared package (`packages/shared`). Existing business logic in `server/modules/*` SHALL be relocated into `apps/server` without behavioral changes; existing frontend code SHALL be relocated into `apps/admin` without behavioral changes.

#### Scenario: Each app builds and runs independently

- **WHEN** any one of `apps/server`, `apps/admin`, `apps/liff` is built or started
- **THEN** it succeeds without requiring the other two apps to be present or built first (aside from `packages/shared`, which all three depend on)

#### Scenario: Shared code is consumed as a workspace package

- **WHEN** any app imports shared types, constants, or utilities (e.g. DTOs, roles, permissions)
- **THEN** it imports them from `packages/shared` as an explicit package import, not via an implicit Nuxt/Nitro path alias

### Requirement: `apps/server` deploys to Cloud Run independently of the frontend apps

The system SHALL deploy `apps/server` as a standalone Nitro-based Node.js server, containerized and deployed to Cloud Run, separately from `apps/admin` and `apps/liff`. The Cloud Run service SHALL be configured with `min-instances: 0` to avoid idle cost.

#### Scenario: API server deploys independently of frontend changes

- **WHEN** only `apps/server` code changes
- **THEN** only the Cloud Run service is rebuilt and redeployed; `apps/admin` and `apps/liff` Hosting deployments are untouched

#### Scenario: API server scales to zero when idle

- **WHEN** the API server receives no requests for an extended period
- **THEN** Cloud Run scales the service to zero running instances, incurring no compute cost while idle

### Requirement: `apps/admin` and `apps/liff` deploy to separate Firebase Hosting targets

The system SHALL deploy `apps/admin` and `apps/liff` as static SPA builds to two distinct Firebase Hosting targets within the same Firebase project.

#### Scenario: LIFF app deploys to its own Hosting target

- **WHEN** `apps/liff` is built and deployed
- **THEN** it is served from its own Firebase Hosting target within the shared Firebase project, independent of `apps/admin`'s target

### Requirement: API server allows cross-origin requests from the frontend apps

Since `apps/admin` and `apps/liff` are deployed to different origins than `apps/server` (Cloud Run vs. Firebase Hosting), the system SHALL configure CORS on `apps/server` to allow requests from the deployed origins of `apps/admin` and `apps/liff`.

#### Scenario: Frontend app calls the API across origins

- **WHEN** `apps/admin` or `apps/liff`, running on its deployed origin, makes a request to `apps/server`
- **THEN** the API server's CORS configuration allows the request to succeed

#### Scenario: Request from an unrecognized origin is rejected

- **WHEN** a request to `apps/server` originates from a domain not in the configured CORS allow-list
- **THEN** the browser blocks the cross-origin response per standard CORS enforcement

### Requirement: CI/CD builds and deploys only the changed app

The system SHALL determine, from the changed file paths in a given commit or pull request, which of the three apps (`apps/server`, `apps/admin`, `apps/liff`) are affected, and SHALL build and deploy only those apps. A change under `packages/shared` SHALL be treated as affecting all three apps.

#### Scenario: Change limited to LIFF app only deploys LIFF

- **WHEN** a commit only modifies files under `apps/liff`
- **THEN** CI/CD builds and deploys only the `apps/liff` Hosting target, leaving `apps/server` and `apps/admin` deployments untouched

#### Scenario: Change affecting shared package deploys all apps

- **WHEN** a commit modifies files under `packages/shared`
- **THEN** CI/CD builds and deploys `apps/server`, `apps/admin`, and `apps/liff`

### Requirement: LIFF app can be tested locally via HTTPS tunneling

The system's local development workflow SHALL support exposing `apps/liff`'s local dev server over HTTPS via a tunneling tool (e.g. ngrok, cloudflared), so it can be opened and tested inside the LINE app, which requires HTTPS and an in-app browser context.

#### Scenario: Developer tests LIFF app inside LINE app during local development

- **WHEN** a developer starts `apps/liff`'s local dev server and exposes it via an HTTPS tunnel
- **THEN** the tunneled URL can be registered as the LIFF endpoint and opened successfully inside the LINE app for manual testing
