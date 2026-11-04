---
"@brrritscold/testing-core-node": minor
---

Stop re-exporting `nock` from the package root. Importing nock patches node's `http` module process-wide, which made testcontainers' `docker exec` readiness checks fail with `write EPIPE` for anyone importing `docker` from the root. Import nock helpers from `@brrritscold/testing-core-node/nock` instead.
