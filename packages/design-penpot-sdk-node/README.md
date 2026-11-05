# @brrritscold/design-penpot-sdk-node

The design system's Penpot edge: a client for Penpot's backend RPC API, the normalizer that turns a library file's `get-file` answer into a **library snapshot** that validates against `@brrritscold/design-core-js/library-snapshot`. It also holds the **snapshot refresh**, which writes the snapshot and opens or updates its PR. Everything past this package takes the normalized snapshot, never raw Penpot objects.

**Private.** Not published, ignored by Changesets. Spec: [`docs/design-system/SPEC.md` § C](https://github.com/bRRRITSCOLD/ts-packages/blob/main/docs/design-system/SPEC.md); terms: [`GLOSSARY.md`](https://github.com/bRRRITSCOLD/ts-packages/blob/main/docs/design-system/GLOSSARY.md).

```ts
import { readLibrarySnapshot } from '@brrritscold/design-penpot-sdk-node/library-snapshot'

const snapshot = await readLibrarySnapshot({
	baseUrl: process.env.PENPOT_URL,
	accessToken: process.env.SNAPSHOT_REFRESH_PENPOT_TOKEN,
	fileId: 'de716cff-f170-81a2-8008-e63b04772bf6', // the design system library
})
```

## Reading Penpot

- **Access token**, sent as `Authorization: Token <token>`; the automation profile's `snapshot-refresh` token only needs to view the library.
- **`get-file` without `features`**, so the backend resolves pointer and object maps itself and answers plain JSON.
- **JSON camel-cases keyword keys.** The exceptions record is shared plugin data `brrritscold.core-react` / `link` on the library component, and arrives as `data.components[id].pluginData.brrritscoldCoreReact.link`. A different spelling of that key throws rather than reading as "no record".
- **The Penpot version is pinned** (`PENPOT_VERSION`, `2.18.6`). `readLibrarySnapshot` first reads the server's `/version.txt` and throws, naming both versions, unless it matches. The snapshot header carries the pin.

## What the snapshot holds

The header (`schemaVersion` 2, the Penpot pin, the library file id), the token catalog, the token themes, and the main components keyed by Penpot component id, sorted, deleted ones left out.

| Field         | From `get-file`                                                                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens`      | `data.tokensLib`, Penpot's own DTCG export: every set but `$themes` / `$metadata`, as `{ set: DTCG tree }` in the shape of `tokens.json`; groups sorted, Penpot's empty `$description` dropped |
| `tokenThemes` | `data.tokensLib.$themes`, as `{ group, name, sets }` (the sets each enables), sorted; `$metadata` (active themes and set order) is not read                                                    |

No `tokensLib` (a file that never had a token) gives `tokens: {}` and `tokenThemes: []`. Per component:

| Field               | From `get-file`                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `path`              | the component's `path`, separator normalized (`Components / Card` → `Components/Card`)                                                                       |
| `name`              | the component's `name`                                                                                                                                       |
| `variantProperties` | a variant's `variantProperties` list, as `{ property: value }`                                                                                               |
| `parts`             | direct children of the main instance that are a component copy (`componentId`) or a plain board or group (`componentId: null`); the role is the child's name |
| `exceptionsRecord`  | the plugin-data JSON, parsed but not validated (drift rule 5 does that); a value that isn't JSON is kept as the raw string                                   |
| `layers`            | every layer of the main instance's tree (nested part copies included) with an applied token or an unbound attribute, by layer id; see below                  |

Text and other leaf layers inside a main component are content, not parts.

### Layers: applied tokens and unbound attributes

Drift rules 7–9 check these attributes only, named as Penpot names the attribute a token is applied to. A layer's `appliedTokens` maps each to the token on it (the shape's `appliedTokens`, camel-cased in JSON: `strokeColor` → `stroke-color`); `unbound` lists those set to a non-default value with no token. `namePath` (the layer names from the main instance down) is only for drift messages.

| Attribute                                                   | Non-default when                                                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `fill`                                                      | the shape has any `fills`, or (a text) any node of its `content` has                            |
| `stroke-color`                                              | the shape has any `strokes`                                                                     |
| `r1`–`r4`                                                   | the radius isn't 0                                                                              |
| `p1`–`p4`, `row-gap`, `column-gap`                          | the board has a `layout` (flex or grid) and that `layoutPadding` / `layoutGap` value isn't 0    |
| `font-family`, `font-size`, `font-weight`, `letter-spacing` | any node of a text's `content` differs from Penpot's text default (`sourcesanspro`, 14, 400, 0) |
| `shadow`                                                    | the shape has any `shadow`                                                                      |
| `opacity`                                                   | the layer opacity isn't 1                                                                       |

Exempt, never recorded: position, width/height and the layout-item sizes, stroke width, rotation, margin, line height, text case and decoration, typography. A token on any attribute Penpot 2.18.6 doesn't know throws.

**A format change fails loudly.** Only the fields above are validated, but strictly: a renamed, removed or retyped field throws `Penpot get-file changed shape at <where> …`, as do a main instance missing from its page, a variant without `variantProperties`, two parts with one role, a token that isn't DTCG, a theme set not marked `enabled` and an unknown `$` key beside the token sets.

## Snapshot refresh

`design-snapshot-refresh` reads the library snapshot as the automation profile, serializes it (sorted, tab-indented, trailing newline) and compares it with `packages/core-react/design/library.snapshot.json` on the base branch:

| Snapshot on the base branch | Open refresh PR         | Does                                                                    |
| --------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| equal                       | any                     | nothing: no branch, no PR; logs `Library snapshot unchanged …`, exits 0 |
| different or missing        | none                    | commits it to `design/snapshot-refresh` and opens one PR                |
| different or missing        | yes                     | commits it to that PR's branch; no second PR                            |
| different or missing        | yes, already holding it | nothing                                                                 |

- **GitHub through the REST API**, no checkout: a contents read, then one commit built with the git data API (a tree on the base branch's tree, parented on the base branch's head) and the branch created or **force-moved** to it. The refresh branch is rebuilt from the base branch on every change, so never push to it by hand.
- **The open refresh PR** is the open PR with head `<owner>:design/snapshot-refresh` into the base branch. Title and commit message: `chore(core-react): refresh the library snapshot`.
- **A PAT, not `GITHUB_TOKEN`**: a PR opened by `GITHUB_TOKEN` wouldn't trigger CI. A fine-grained PAT on this repo with **Contents: read and write** and **Pull requests: read and write**.
- The `drift` label on a refresh PR with a red drift check is the CI drift check's job, not this one.
- Biome ignores `library.snapshot.json`, so a formatter never turns the same snapshot into different bytes.

### Configuration

All from env vars. A missing required one fails before any request, naming every missing variable.

| Variable                           | Required           | Default                                | In the cluster (`penpot` namespace)          |
| ---------------------------------- | ------------------ | -------------------------------------- | -------------------------------------------- |
| `PENPOT_URL`                       | yes                |                                        | the frontend Service URL, not the ingress    |
| `SNAPSHOT_REFRESH_PENPOT_TOKEN`    | yes                |                                        | Secret `snapshot-refresh`, key `penpotToken` |
| `SNAPSHOT_REFRESH_GITHUB_TOKEN`    | not with `--write` |                                        | Secret `snapshot-refresh`, key `githubToken` |
| `SNAPSHOT_REFRESH_LIBRARY_FILE_ID` | no                 | `de716cff-f170-81a2-8008-e63b04772bf6` |                                              |
| `SNAPSHOT_REFRESH_GITHUB_REPO`     | no                 | `bRRRITSCOLD/ts-packages`              |                                              |
| `SNAPSHOT_REFRESH_BASE_BRANCH`     | no                 | `main`                                 |                                              |

Locally, `~/.config/penpot/env` exports the first three.

### Running it

```bash
pnpm --filter '@brrritscold/design-penpot-sdk-node...' build

# Lockstep (after an MCP edit, inside a core-react PR): write the snapshot into the checkout; no GitHub
node packages/design-penpot-sdk-node/bin/design-snapshot-refresh.mjs \
  --write packages/core-react/design/library.snapshot.json

# What the CronJob runs: compare with main, open or update the refresh PR
node packages/design-penpot-sdk-node/bin/design-snapshot-refresh.mjs
```

Exit 0 when done (unchanged included), 1 on any failure, with the reason on stderr.

The image `ghcr.io/brrritscold/design-snapshot-refresh` (`images/design-snapshot-refresh/Dockerfile`, built by `.github/workflows/side-images.yml`, tagged with the short git SHA, never `latest`) runs the second form as the `node` user:

```bash
docker run --rm -e PENPOT_URL -e SNAPSHOT_REFRESH_PENPOT_TOKEN -e SNAPSHOT_REFRESH_GITHUB_TOKEN \
  ghcr.io/brrritscold/design-snapshot-refresh:<short-sha>
```

## Tests

| Tier          | Runs against                                                                                           | Where                   |
| ------------- | ------------------------------------------------------------------------------------------------------ | ----------------------- |
| `unit`        | the normalizer on the committed recordings and mutated copies; the refresh's config and serializer     | every commit, hosted CI |
| `integration` | `readLibrarySnapshot` and the refresh with nock replaying the recordings and GitHub; no net connect    | every commit, hosted CI |
| `e2e`         | the live Penpot, as the automation profile (read only; the refresh has no e2e, it would open real PRs) | opt-in, never hosted CI |

`pnpm test:e2e` needs `PENPOT_URL` and `SNAPSHOT_REFRESH_PENPOT_TOKEN` in the process env (never a repo `.env`); a missing one fails the run naming it. It also checks the fixture recording is still what the live Penpot answers.

### Recordings

`tests/__recordings__/penpot-<version>/get-file.*.json` are real Penpot answers, each with the requests behind one `readLibrarySnapshot` call and no headers:

- **`snapshot-fixture`**: a file in the automation profile's own Drafts holding one of everything the normalizer reads (a variant set, a compound component whose part is a copy, a plain-board part, an `icon/` component, `_internal/Slot`, an exceptions record, a token catalog of a few `primitive` and `light` / `dark` tokens with the `Mode` themes, tokens applied to fill, stroke, radius, padding, gap, font weight and shadow, an unbound fill on the slot and a primitive colour on `Card/Header`'s fill). The real library may be empty, so this is what exercises the normalizer.
- **`design-system-library`**: the design system library itself, read only.

**At a Penpot pin bump**, bump `PENPOT_VERSION` and re-record in the same PR; review the recording diff like code:

```bash
pnpm --filter @brrritscold/design-penpot-sdk-node record:penpot
```

It needs the same two env vars. When `snapshot-fixture` is missing from the automation profile's Drafts (a fresh Penpot), it creates it there through `create-file` + `update-file` (tokens through `set-token-set`, `set-token`, `set-token-theme` and `set-active-token-themes`, applied tokens as each layer's `appliedTokens`); an existing one is left as it is. After changing what the fixture holds (`fixtureChanges` in `record.ts`), pass `--recreate` to delete the existing one and create it again:

```bash
pnpm --filter @brrritscold/design-penpot-sdk-node record:penpot --recreate
```

That file is the only thing it ever writes or deletes.

<!-- api:start -->
<!-- Generated by scripts/readme-api.mjs from the TSDoc comments. Do not edit by hand. -->

## API

Full reference: [brrritscold.github.io/ts-packages](https://brrritscold.github.io/ts-packages/modules/_brrritscold_design-penpot-sdk-node.html)

### [`@brrritscold/design-penpot-sdk-node/library-snapshot`](https://brrritscold.github.io/ts-packages/modules/_brrritscold_design-penpot-sdk-node.library-snapshot.html)

```ts
import { … } from '@brrritscold/design-penpot-sdk-node/library-snapshot'
```

| Export                          | Kind     | Summary                                                                                                                                                                                                                                                                                                                |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normalizeLibrarySnapshot`      | function | Normalizes a raw `get-file` result into a library snapshot: the design system library's token catalog and themes, and its main components keyed by Penpot component id, each with its path, name, variant properties, parts by role, exceptions record and layers, sorted so the same file always serializes the same. |
| `readLibrarySnapshot`           | function | Reads a library file from Penpot and returns its library snapshot: checks the server runs the pinned Penpot version (throwing if not), calls `get-file` without `features`, and normalizes the result with normalizeLibrarySnapshot.                                                                                   |
| `ReadLibrarySnapshotParameters` | type     | What readLibrarySnapshot needs: the client parameters and the library file's id.                                                                                                                                                                                                                                       |

### [`@brrritscold/design-penpot-sdk-node/rpc`](https://brrritscold.github.io/ts-packages/modules/_brrritscold_design-penpot-sdk-node.rpc.html)

```ts
import { … } from '@brrritscold/design-penpot-sdk-node/rpc'
```

| Export                            | Kind     | Summary                                                                                                                                                                                                                                            |
| --------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createPenpotRpcClient`           | function | Creates a client for Penpot's backend RPC API (`/api/rpc/command/<name>`), authenticated with an access token and asking for JSON, in which Penpot camel-cases every keyword key.                                                                  |
| `CreatePenpotRpcClientParameters` | type     | What createPenpotRpcClient needs: where Penpot is and an access token to read as.                                                                                                                                                                  |
| `PENPOT_VERSION`                  | variable | The Penpot version this package reads. Penpot's file formats are unversioned, so this pin is the only thing that says which `get-file` shape the normalizer expects; bumping it re-records the committed `get-file` recordings in the same change. |
| `PenpotRpcClient`                 | type     | A client for Penpot's backend RPC API, as returned by createPenpotRpcClient.                                                                                                                                                                       |

### [`@brrritscold/design-penpot-sdk-node/snapshot-refresh`](https://brrritscold.github.io/ts-packages/modules/_brrritscold_design-penpot-sdk-node.snapshot-refresh.html)

```ts
import { … } from '@brrritscold/design-penpot-sdk-node/snapshot-refresh'
```

| Export                             | Kind     | Summary                                                                                                                                                                                                                                                                                                      |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GitHubPullRequest`                | type     | An open pull request, as the refresh needs it.                                                                                                                                                                                                                                                               |
| `LIBRARY_SNAPSHOT_PATH`            | variable | Where the library snapshot lives in the repo, relative to its root.                                                                                                                                                                                                                                          |
| `readSnapshotRefreshConfig`        | function | Reads the snapshot refresh's configuration from environment variables, throwing one error that names every missing required variable.                                                                                                                                                                        |
| `refreshLibrarySnapshot`           | function | Runs the snapshot refresh: reads the library snapshot from Penpot, compares it with LIBRARY_SNAPSHOT_PATH on the base branch and, when it changed, commits it to SNAPSHOT_REFRESH_BRANCH (rebuilt on top of the base branch) and opens a PR, or updates the refresh PR already open. Unchanged does nothing. |
| `RefreshLibrarySnapshotParameters` | type     | What refreshLibrarySnapshot needs: the configuration, and optionally `fetch` and a logger.                                                                                                                                                                                                                   |
| `runSnapshotRefreshCli`            | function | Runs the `design-snapshot-refresh` CLI and returns its exit code (0 done, 1 failed). With no arguments it runs refreshLibrarySnapshot (the CronJob); with `--write <file>` it only writes the snapshot to a local file, for committing into a `core-react` PR, and needs no GitHub token.                    |
| `serializeLibrarySnapshot`         | function | Serializes a library snapshot the one way it is committed: tab-indented JSON with a trailing newline. The normalizer already sorts it, so the same library always gives the same bytes. Biome ignores the committed file, so a formatter never rewrites it into a false "changed".                           |
| `SNAPSHOT_REFRESH_BRANCH`          | variable | The branch every refresh PR comes from; there is only ever one refresh PR.                                                                                                                                                                                                                                   |
| `SNAPSHOT_REFRESH_DEFAULTS`        | variable | The defaults behind the optional environment variables of the snapshot refresh.                                                                                                                                                                                                                              |
| `SNAPSHOT_REFRESH_TITLE`           | variable | The refresh PR's title, also its commit message.                                                                                                                                                                                                                                                             |
| `SnapshotRefreshCliIo`             | type     | What runSnapshotRefreshCli reads and writes; the process by default.                                                                                                                                                                                                                                         |
| `SnapshotRefreshConfig`            | type     | The snapshot refresh's configuration, as read by readSnapshotRefreshConfig.                                                                                                                                                                                                                                  |
| `SnapshotRefreshResult`            | type     | What a refresh did: `unchanged` (the snapshot equals the base branch's, no PR), `up-to-date` (the open refresh PR already holds it), `opened` or `updated` a refresh PR.                                                                                                                                     |

<!-- api:end -->
