# @brrritscold ts-packages

Turborepo + pnpm monorepo for shared TypeScript libraries, published to npm under `@brrritscold`.

| Package                                                          | Runtime        | What                                                                     |
| ---------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| [`@brrritscold/core-js`](./packages/core-js)                     | browser + node | `date`, `error`, `obj`, `query`, `zod`                                   |
| [`@brrritscold/core-node`](./packages/core-node)                 | node           | `dotenv`, `jwt`, `mongodb`, `postgres`, `s3`, `secrets-manager`, `query` |
| [`@brrritscold/core-express`](./packages/core-express)           | node           | JWT middleware, typed OpenAPI router, server creation                    |
| [`@brrritscold/testing-core-js`](./packages/testing-core-js)     | browser + node | test helpers (`deepCopy`)                                                |
| [`@brrritscold/testing-core-node`](./packages/testing-core-node) | node           | testcontainers wrappers, nock interceptors                               |

## Develop

```bash
pnpm install
pnpm build            # turbo, dependency-ordered, cached
pnpm typecheck
pnpm test:unit
pnpm test:integration # needs Docker (testcontainers)
pnpm lint
```

Work on one package: `pnpm --filter @brrritscold/core-node test:unit`.

## Release

1. `pnpm changeset` — pick packages, bump type, summary. Commit the generated file.
2. Merge to `main`. After CI (check + integration) passes, the `release` job opens a "Version Packages" PR.
3. Merge that PR. The workflow publishes changed packages to npm.

`main` is protected: changes land by PR, `check` and `integration` must pass, squash-merge only.
The "Version Packages" PR is opened by `GITHUB_TOKEN`, which does not trigger workflows — **close and reopen it** to run the required checks before merging.

Needs repo secret `NPM_TOKEN` (npm automation token with publish rights to `@brrritscold`).

## License

[MIT](./LICENSE)
