---
"@brrritscold/core-js": minor
"@brrritscold/core-node": minor
"@brrritscold/core-express": minor
"@brrritscold/testing-core-js": minor
"@brrritscold/testing-core-node": minor
---

Remove the package-root entry: import every API from its fully qualified subpath (`@brrritscold/core-js/date`, `@brrritscold/testing-core-node/docker`, …). `import { date } from '@brrritscold/core-js'` and the other root namespace imports no longer resolve.

`core-express` gains subpaths in place of its root namespaces: `./error`, `./middlewares/jwt`, `./openapi`, `./utils/create-server`, `./utils/jwt`.

Builds now use code splitting, so a class shared between subpaths (such as `HttpException`, used by `/error`, `/query` and `/zod`) has a single identity and `instanceof` works across entries.
