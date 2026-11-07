# ghcr.io/brrritscold/design-penpot-static: the link inspector plugin and the link reader.
# Build from the repo root: docker build -f images/design-penpot-static/Dockerfile .
# Serves /link-inspector/{manifest.json,plugin.js,ui.html,ui.js} and /read-links.js on :8080,
# with CORS pinned to the Penpot origin (PENPOT_ORIGIN, default http://penpot.localhost).

ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.29-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /repo
RUN corepack enable
# Lockfile first, so the dependency layer survives source edits.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
COPY packages/core-js packages/core-js
COPY packages/design-core-js packages/design-core-js
COPY packages/design-penpot-ui packages/design-penpot-ui
# Only this package and its workspace deps, plus the root (tsup lives there); no husky.
RUN pnpm install --offline --frozen-lockfile --ignore-scripts \
	--filter brrritscold-ts-packages --filter '@brrritscold/design-penpot-ui...'
RUN pnpm --filter '@brrritscold/design-penpot-ui...' run build

FROM ${NGINX_IMAGE}
ENV PENPOT_ORIGIN=http://penpot.localhost
# The image's entrypoint renders templates/*.template into conf.d with envsubst.
COPY images/design-penpot-static/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/packages/design-penpot-ui/dist/ /usr/share/nginx/html/
