# @brrritscold/testing-core-node

## 0.2.0

### Minor Changes

- [#22](https://github.com/bRRRITSCOLD/ts-packages/pull/22) [`f83a9c2`](https://github.com/bRRRITSCOLD/ts-packages/commit/f83a9c2e638d981f4a2d69cd5773ae81b01d7e54) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Stop re-exporting `nock` from the package root. Importing nock patches node's `http` module process-wide, which made testcontainers' `docker exec` readiness checks fail with `write EPIPE` for anyone importing `docker` from the root. Import nock helpers from `@brrritscold/testing-core-node/nock` instead.

## 0.1.1

### Patch Changes

- [#2](https://github.com/bRRRITSCOLD/ts-packages/pull/2) [`e83c145`](https://github.com/bRRRITSCOLD/ts-packages/commit/e83c145a84dc518e9158fe356755557a876d4281) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Docs: README now lists every entry point and export with a summary, links to the API reference site, and `homepage` points at the package's reference page.

  `@brrritscold/core-express`: the invalid-JWT error message is now `JWT value not valid.` (was prefixed with `Company`).
