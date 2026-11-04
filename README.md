# @brrritscold ts-packages

Turborepo + pnpm monorepo for shared TypeScript libraries, published to npm under `@brrritscold`.

**API reference:** https://brrritscold.github.io/ts-packages/

| Package                                                          | Runtime        | What                                                                      |
| ---------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------- |
| [`@brrritscold/core-js`](./packages/core-js)                     | browser + node | `date`, `error`, `obj`, `query`, `zod`                                    |
| [`@brrritscold/core-node`](./packages/core-node)                 | node           | `dotenv`, `jwt`, `mongodb`, `postgres`, `s3`, `secrets-manager`, `query`  |
| [`@brrritscold/core-express`](./packages/core-express)           | node           | `error`, `middlewares/jwt`, `openapi`, `utils/create-server`, `utils/jwt` |
| [`@brrritscold/testing-core-js`](./packages/testing-core-js)     | browser + node | test helpers (`deepCopy`)                                                 |
| [`@brrritscold/testing-core-node`](./packages/testing-core-node) | node           | testcontainers wrappers, nock interceptors                                |

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

## Entry points

Packages have **no root entry**: always import a fully qualified subpath, such as `@brrritscold/core-js/date` or `@brrritscold/testing-core-node/docker`, never `@brrritscold/core-js`. There are no `index.ts` barrels. Each subpath loads only its own module, and each export has exactly one import path. Shared code between subpaths is split into chunks (tsup `splitting: true`), so classes keep one identity across entries.

`pnpm check:entries` enforces this in CI. It fails on a `"."` export, on `main` / `module` / `types` fields, on any `src/**/index.ts`, or when `exports`, tsup `entryPoints` and typedoc `entryPoints` disagree.

## Docs

Docs come from the TSDoc comments in `src/` — there is nothing to write by hand outside them.

| Output                                                   | Where                                                   | Built by                                        |
| -------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| API reference site                                       | GitHub Pages                                            | `docs` job in CI, after every release on `main` |
| `## API` section of each package README (what npm shows) | `packages/*/README.md` between `<!-- api:start/end -->` | `pnpm docs:readme`, committed                   |
| CHANGELOG with PR + commit links                         | `packages/*/CHANGELOG.md`                               | Changesets, on the Version Packages PR          |

`pnpm docs:check` runs in CI and fails when TypeDoc warns, a README API section is stale, or a public export has no summary sentence. After changing a public API, run `pnpm docs:readme` and commit the README diff.

## Release

1. `pnpm changeset` — pick packages, bump type, summary. Commit the generated file.
2. Merge to `main`. After CI (check + integration) passes, the `release` job opens a "Version Packages" PR.
3. Merge that PR. The workflow publishes changed packages to npm.

`main` is protected: changes land by PR, `check` and `integration` must pass, squash-merge only.
The "Version Packages" PR is opened by `GITHUB_TOKEN`, which does not trigger workflows — **close and reopen it** to run the required checks before merging.

Needs repo secret `NPM_TOKEN` (npm automation token with publish rights to `@brrritscold`).

## License

[MIT](./LICENSE)
