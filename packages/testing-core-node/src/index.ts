// `nock` is deliberately not re-exported: importing it patches node's http module
// process-wide, which breaks testcontainers' `docker exec` readiness checks.
// Import it explicitly from `@brrritscold/testing-core-node/nock`.
export * as docker from './docker.js'
