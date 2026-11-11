# @brrritscold/testing-core-node

## 0.3.1

### Patch Changes

- [#131](https://github.com/bRRRITSCOLD/ts-packages/pull/131) [`7906dbd`](https://github.com/bRRRITSCOLD/ts-packages/commit/7906dbdad480c32cf01bb93adeb1acc43d4a747d) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - `PostgresContainer.start()` resolves only once postgres accepts TCP connections, via a `pg_isready` health check, instead of as soon as the port is bound. The official image binds its port before it finishes starting up, so a client connecting straight after `start()` could get `the database system is starting up`. `Container` takes an optional `healthCheck`.

## 0.3.0

### Minor Changes

- [#25](https://github.com/bRRRITSCOLD/ts-packages/pull/25) [`67f6966`](https://github.com/bRRRITSCOLD/ts-packages/commit/67f696698daf3e9d05a9c66860700956e8a4f5c2) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Remove the package-root entry: import every API from its fully qualified subpath (`@brrritscold/core-js/date`, `@brrritscold/testing-core-node/docker`, …). `import { date } from '@brrritscold/core-js'` and the other root namespace imports no longer resolve.

  `core-express` gains subpaths in place of its root namespaces: `./error`, `./middlewares/jwt`, `./openapi`, `./utils/create-server`, `./utils/jwt`.

  Builds now use code splitting, so a class shared between subpaths (such as `HttpException`, used by `/error`, `/query` and `/zod`) has a single identity and `instanceof` works across entries.

## 0.2.0

### Minor Changes

- [#22](https://github.com/bRRRITSCOLD/ts-packages/pull/22) [`f83a9c2`](https://github.com/bRRRITSCOLD/ts-packages/commit/f83a9c2e638d981f4a2d69cd5773ae81b01d7e54) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Stop re-exporting `nock` from the package root. Importing nock patches node's `http` module process-wide, which made testcontainers' `docker exec` readiness checks fail with `write EPIPE` for anyone importing `docker` from the root. Import nock helpers from `@brrritscold/testing-core-node/nock` instead.

## 0.1.1

### Patch Changes

- [#2](https://github.com/bRRRITSCOLD/ts-packages/pull/2) [`e83c145`](https://github.com/bRRRITSCOLD/ts-packages/commit/e83c145a84dc518e9158fe356755557a876d4281) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Docs: README now lists every entry point and export with a summary, links to the API reference site, and `homepage` points at the package's reference page.

  `@brrritscold/core-express`: the invalid-JWT error message is now `JWT value not valid.` (was prefixed with `Company`).
