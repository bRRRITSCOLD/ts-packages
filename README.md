# @brrritscold ts-packages

Turborepo + pnpm monorepo for shared TypeScript libraries, published to npm under `@brrritscold`.

**API reference:** https://brrritscold.github.io/ts-packages/

| Package                                                                                                                     | Runtime        | What                                                                      |
| --------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------- |
| [`@brrritscold/core-js`](./packages/core-js)                                                                                | browser + node | `date`, `error`, `obj`, `query`, `zod`                                    |
| [`@brrritscold/core-node`](./packages/core-node)                                                                            | node           | `dotenv`, `jwt`, `mongodb`, `postgres`, `s3`, `secrets-manager`, `query`  |
| [`@brrritscold/core-express`](./packages/core-express)                                                                      | node           | `error`, `middlewares/jwt`, `openapi`, `utils/create-server`, `utils/jwt` |
| [`@brrritscold/testing-core-js`](./packages/testing-core-js)                                                                | browser + node | test helpers (`deepCopy`)                                                 |
| [`@brrritscold/testing-core-node`](./packages/testing-core-node)                                                            | node           | testcontainers wrappers, nock interceptors                                |
| [`@brrritscold/design-core-js`](./packages/design-core-js) (private)                                                        | browser + node | component-link resolver, snapshot schemas, drift rules, coverage report   |
| [`@brrritscold/design-core-node`](./packages/design-core-node) (private)                                                    | node           | code manifest generator, `design-drift` CLI                               |
| [`@brrritscold/design-penpot-sdk-node`](./packages/design-penpot-sdk-node) (private)                                        | node           | Penpot RPC client, library-snapshot normalizer, `design-snapshot-refresh` |
| [`@brrritscold/design-penpot-ui`](https://github.com/bRRRITSCOLD/ts-packages/tree/main/packages/design-penpot-ui) (private) | browser        | link inspector Penpot plugin, `read-links.js` link reader                 |
| [`@brrritscold/core-react`](https://github.com/bRRRITSCOLD/ts-packages/tree/main/packages/core-react) (private)             | browser + SSR  | React components, design tokens, `styles.css` (Storybook is its docs)     |

## Develop

```bash
pnpm install
pnpm build            # turbo, dependency-ordered, cached
pnpm typecheck
pnpm test:unit
pnpm test:stories     # core-react's stories in Chromium (pnpm exec playwright install chromium once)
pnpm test:integration # needs Docker (testcontainers)
pnpm lint
```

Work on one package: `pnpm --filter @brrritscold/core-node test:unit`.

## Entry points

Packages have **no root entry** (`core-react` is the one exception, a pure barrel; see its README): always import a fully qualified subpath, such as `@brrritscold/core-js/date` or `@brrritscold/testing-core-node/docker`, never `@brrritscold/core-js`. There are no `index.ts` barrels. Each subpath loads only its own module, and each export has exactly one import path. Shared code between subpaths is split into chunks (tsup `splitting: true`), so classes keep one identity across entries.

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

**Did it publish?** Read the **"Release result"** notice on the run page: `PUBLISHED: name@version, …` or `NOT published` with the reason. Don't go by the job's colour or by which step ran. The `release` job has two named steps, and only one runs per push: _Open or update Version Packages PR (no publish)_ when `.changeset/` holds changeset files, otherwise _Publish unpublished versions to npm (no-op if all are published)_. A green publish step often publishes nothing, for example on any merge after the Version Packages PR. A "Release mode" notice states the mode up front, and the job summary repeats the result.

The `docs` job (GitHub Pages) deploys only when the release job actually published, so the site always matches npm.

This is the standard Changesets flow (as used by pnpm, Astro and Remix): merging code and releasing it are separate steps, with a human gate on the release.

`main` is protected: changes land by PR, `check` and `integration` must pass, squash-merge only.
The Version Packages PR is opened by `GITHUB_TOKEN`, which does not trigger workflows, so **close and reopen it** to run the required checks before merging.

Needs repo secret `NPM_TOKEN`: a granular npm token, read-write on `@brrritscold`, with bypass-2FA enabled.

npm uses staged publishing: a `0.0.0-stage` placeholder appears first, and the real version goes live a minute or three later. A version missing from `npm view` right after a green publish run is lag, not a failure.

## Side images

`.github/workflows/side-images.yml` builds the design system's container images from `images/<name>/Dockerfile` and pushes them to GHCR, on pushes to `main` that touch their sources and on manual dispatch. Tags are the **short git SHA** only, never `latest`.

| Image                                         | Runs                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ghcr.io/brrritscold/design-snapshot-refresh` | the snapshot refresh ([`design-penpot-sdk-node`](./packages/design-penpot-sdk-node))                                                                                                        |
| `ghcr.io/brrritscold/design-penpot-static`    | nginx serving the link inspector and `read-links.js` ([`design-penpot-ui`](https://github.com/bRRRITSCOLD/ts-packages/tree/main/packages/design-penpot-ui)), CORS pinned to `PENPOT_ORIGIN` |

Build one locally from the repo root: `docker build -f images/design-snapshot-refresh/Dockerfile .`. A new image's GHCR package starts private: set it to public in its package settings after the first push.

## License

[MIT](./LICENSE)
