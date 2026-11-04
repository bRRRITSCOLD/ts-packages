# @brrritscold ts-packages

Turborepo + pnpm monorepo for shared TypeScript libraries, published to npm under `@brrritscold`.

**API reference:** https://brrritscold.github.io/ts-packages/

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

## Docs

Docs come from the TSDoc comments in `src/` — there is nothing to write by hand outside them.

| Output                                                   | Where                                                   | Built by                                        |
| -------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| API reference site                                       | GitHub Pages                                            | `docs` job in CI, after every release on `main` |
| `## API` section of each package README (what npm shows) | `packages/*/README.md` between `<!-- api:start/end -->` | `pnpm docs:readme`, committed                   |
| CHANGELOG with PR + commit links                         | `packages/*/CHANGELOG.md`                               | Changesets, on the Version Packages PR          |

`pnpm docs:check` runs in CI and fails when TypeDoc warns, a README API section is stale, or a public export has no summary sentence. After changing a public API, run `pnpm docs:readme` and commit the README diff.

## Release

Releasing takes **two merges**. Merging a feature PR never publishes to npm on its own.

```
feature PR (code + .changeset/*.md) ──merge──▶ main
   release job, mode "Version PR": opens/updates the "Version Packages" PR
   (bumps versions, writes CHANGELOGs, deletes the changeset files). Nothing published.

"Version Packages" PR ──merge──▶ main
   release job, mode "publish": no changesets left → `changeset publish`
   publishes every version not yet on npm, pushes `@brrritscold/<name>@<version>`
   tags and GitHub releases, then the docs job deploys the API site.
```

1. `pnpm changeset`: pick packages, bump type, summary. Commit the generated file with the change.
2. Merge the PR. After `check` + `integration` pass, the `release` job opens or updates the **Version Packages** PR. Changesets from several PRs pile up in that one PR, which is how releases get batched.
3. Merge the Version Packages PR when you want to release. That run publishes.

**Which mode ran?** The `release` job has two named steps, and only one runs per push: _Open or update Version Packages PR (no publish)_ or _Publish to npm_. The mode is chosen by whether `.changeset/` still holds changeset files. The run page shows a "Release mode" notice, and the job summary lists what was opened or published. A green `release` job in Version PR mode published nothing.

The `docs` job (GitHub Pages) deploys only when the release job actually published, so the site always matches npm.

This is the standard Changesets flow (as used by pnpm, Astro and Remix): merging code and releasing it are separate steps, with a human gate on the release.

`main` is protected: changes land by PR, `check` and `integration` must pass, squash-merge only.
The Version Packages PR is opened by `GITHUB_TOKEN`, which does not trigger workflows, so **close and reopen it** to run the required checks before merging.

Needs repo secret `NPM_TOKEN`: a granular npm token, read-write on `@brrritscold`, with bypass-2FA enabled.

npm uses staged publishing: a `0.0.0-stage` placeholder appears first, and the real version goes live a minute or three later. A version missing from `npm view` right after a green publish run is lag, not a failure.

## License

[MIT](./LICENSE)
