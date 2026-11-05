# ghcr.io/brrritscold/design-snapshot-refresh: the snapshot refresh as a CronJob image.
# Build from the repo root: docker build -f images/design-snapshot-refresh/Dockerfile .
# Configured entirely by env vars; see packages/design-penpot-sdk-node/README.md.

ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /repo
RUN corepack enable
# Lockfile first, so the dependency layer survives source edits.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
COPY packages/core-js packages/core-js
COPY packages/design-core-js packages/design-core-js
COPY packages/design-penpot-sdk-node packages/design-penpot-sdk-node
# Manifests only: the package's devDependencies name them, and `pnpm deploy` resolves every
# workspace ref even with --prod. Nothing of theirs ends up in the image.
COPY packages/testing-core-js/package.json packages/testing-core-js/
COPY packages/testing-core-node/package.json packages/testing-core-node/
# Only this package and its workspace deps, plus the root (tsup lives there); no husky.
RUN pnpm install --offline --frozen-lockfile --ignore-scripts \
	--filter brrritscold-ts-packages --filter '@brrritscold/design-penpot-sdk-node...' \
	--filter '!@brrritscold/testing-core-*'
RUN pnpm --filter '@brrritscold/design-penpot-sdk-node...' --filter '!@brrritscold/testing-core-*' run build
RUN pnpm --filter @brrritscold/design-penpot-sdk-node deploy --legacy --prod /app

FROM ${NODE_IMAGE}
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
USER node
ENTRYPOINT ["node", "/app/bin/design-snapshot-refresh.mjs"]
