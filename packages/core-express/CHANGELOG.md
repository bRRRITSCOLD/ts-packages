# @brrritscold/core-express

## 0.2.0

### Minor Changes

- [#25](https://github.com/bRRRITSCOLD/ts-packages/pull/25) [`67f6966`](https://github.com/bRRRITSCOLD/ts-packages/commit/67f696698daf3e9d05a9c66860700956e8a4f5c2) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Remove the package-root entry: import every API from its fully qualified subpath (`@brrritscold/core-js/date`, `@brrritscold/testing-core-node/docker`, …). `import { date } from '@brrritscold/core-js'` and the other root namespace imports no longer resolve.

  `core-express` gains subpaths in place of its root namespaces: `./error`, `./middlewares/jwt`, `./openapi`, `./utils/create-server`, `./utils/jwt`.

  Builds now use code splitting, so a class shared between subpaths (such as `HttpException`, used by `/error`, `/query` and `/zod`) has a single identity and `instanceof` works across entries.

### Patch Changes

- Updated dependencies [[`67f6966`](https://github.com/bRRRITSCOLD/ts-packages/commit/67f696698daf3e9d05a9c66860700956e8a4f5c2)]:
  - @brrritscold/core-js@0.2.0
  - @brrritscold/core-node@1.0.0

## 0.1.1

### Patch Changes

- [#2](https://github.com/bRRRITSCOLD/ts-packages/pull/2) [`e83c145`](https://github.com/bRRRITSCOLD/ts-packages/commit/e83c145a84dc518e9158fe356755557a876d4281) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Docs: README now lists every entry point and export with a summary, links to the API reference site, and `homepage` points at the package's reference page.

  `@brrritscold/core-express`: the invalid-JWT error message is now `JWT value not valid.` (was prefixed with `Company`).

- Updated dependencies [[`e83c145`](https://github.com/bRRRITSCOLD/ts-packages/commit/e83c145a84dc518e9158fe356755557a876d4281)]:
  - @brrritscold/core-js@0.1.1
  - @brrritscold/core-node@0.1.1
