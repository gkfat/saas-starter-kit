# Build context MUST be the monorepo root (pnpm workspace + packages/shared are required):
#   docker build -f apps/server/Dockerfile -t saas-starter-kit-server .

FROM node:22-slim AS builder
WORKDIR /repo

RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/liff/package.json apps/liff/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY scripts scripts
COPY apps/server apps/server

# Feature flags are baked into Nitro's runtimeConfig at build time (see
# apps/server/nitro.config.ts) — they must be supplied here, not as Cloud Run
# runtime env vars, or they silently fall back to the hardcoded defaults.
ARG FEATURE_AUDIT_LOG_ENABLED=true
ARG FEATURE_LOGIN_LOG_ENABLED=true
ARG FEATURE_LEVEL_ENABLED=true
ARG FEATURE_COUPON_ENABLED=false
ARG FEATURE_POINTS_ENABLED=true
ARG FEATURE_EVENT_ENABLED=true
ENV FEATURE_AUDIT_LOG_ENABLED=$FEATURE_AUDIT_LOG_ENABLED
ENV FEATURE_LOGIN_LOG_ENABLED=$FEATURE_LOGIN_LOG_ENABLED
ENV FEATURE_LEVEL_ENABLED=$FEATURE_LEVEL_ENABLED
ENV FEATURE_COUPON_ENABLED=$FEATURE_COUPON_ENABLED
ENV FEATURE_POINTS_ENABLED=$FEATURE_POINTS_ENABLED
ENV FEATURE_EVENT_ENABLED=$FEATURE_EVENT_ENABLED

RUN pnpm --dir apps/server build

# Runtime image: Nitro's node-server output is self-contained (deps bundled),
# no node_modules / pnpm workspace needed at runtime.
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /repo/apps/server/.output ./.output

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
