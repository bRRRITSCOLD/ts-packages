---
'@brrritscold/testing-core-node': patch
---

`PostgresContainer.start()` resolves only once postgres accepts TCP connections, via a `pg_isready` health check, instead of as soon as the port is bound. The official image binds its port before it finishes starting up, so a client connecting straight after `start()` could get `the database system is starting up`. `Container` takes an optional `healthCheck`.
