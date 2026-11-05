# @brrritscold/design-penpot-sdk-node

The design system's Penpot edge: a client for Penpot's backend RPC API, and the normalizer that turns a library file's `get-file` answer into a **library snapshot** that validates against `@brrritscold/design-core-js/library-snapshot`. Everything past this package takes the normalized snapshot, never raw Penpot objects.

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

Main components keyed by Penpot component id, sorted, deleted ones left out:

| Field               | From `get-file`                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `path`              | the component's `path`, separator normalized (`Components / Card` → `Components/Card`)                                                                       |
| `name`              | the component's `name`                                                                                                                                       |
| `variantProperties` | a variant's `variantProperties` list, as `{ property: value }`                                                                                               |
| `parts`             | direct children of the main instance that are a component copy (`componentId`) or a plain board or group (`componentId: null`); the role is the child's name |
| `exceptionsRecord`  | the plugin-data JSON, parsed but not validated (drift rule 5 does that); a value that isn't JSON is kept as the raw string                                   |

Text and other leaf layers inside a main component are content, not parts.

**A format change fails loudly.** Only the fields above are validated, but strictly: a renamed, removed or retyped field throws `Penpot get-file changed shape at <where> …`, as do a main instance missing from its page, a variant without `variantProperties` and two parts with one role.

## Tests

| Tier          | Runs against                                                                   | Where                   |
| ------------- | ------------------------------------------------------------------------------ | ----------------------- |
| `unit`        | the normalizer on the committed recordings, and on mutated copies of them      | every commit, hosted CI |
| `integration` | `readLibrarySnapshot` with nock replaying the recordings; net connect disabled | every commit, hosted CI |
| `e2e`         | the live Penpot, as the automation profile                                     | opt-in, never hosted CI |

`pnpm test:e2e` needs `PENPOT_URL` and `SNAPSHOT_REFRESH_PENPOT_TOKEN` in the process env (never a repo `.env`); a missing one fails the run naming it. It also checks the fixture recording is still what the live Penpot answers.

### Recordings

`tests/__recordings__/penpot-<version>/get-file.*.json` are real Penpot answers, each with the requests behind one `readLibrarySnapshot` call and no headers:

- **`snapshot-fixture`**: a file in the automation profile's own Drafts holding one of everything the normalizer reads (a variant set, a compound component whose part is a copy, a plain-board part, an `icon/` component, `_internal/Slot`, an exceptions record). The real library may be empty, so this is what exercises the normalizer.
- **`design-system-library`**: the design system library itself, read only.

**At a Penpot pin bump**, bump `PENPOT_VERSION` and re-record in the same PR; review the recording diff like code:

```bash
pnpm --filter @brrritscold/design-penpot-sdk-node record:penpot
```

It needs the same two env vars. When `snapshot-fixture` is missing from the automation profile's Drafts (a fresh Penpot), it creates it there through `create-file` + `update-file`; that file is the only thing it ever writes, and an existing one is left as it is.

<!-- api:start -->
<!-- Generated by scripts/readme-api.mjs from the TSDoc comments. Do not edit by hand. -->

## API

Full reference: [brrritscold.github.io/ts-packages](https://brrritscold.github.io/ts-packages/modules/_brrritscold_design-penpot-sdk-node.html)

### [`@brrritscold/design-penpot-sdk-node/library-snapshot`](https://brrritscold.github.io/ts-packages/modules/_brrritscold_design-penpot-sdk-node.library-snapshot.html)

```ts
import { … } from '@brrritscold/design-penpot-sdk-node/library-snapshot'
```

| Export                          | Kind     | Summary                                                                                                                                                                                                                                                                      |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normalizeLibrarySnapshot`      | function | Normalizes a raw `get-file` result into a library snapshot: the design system library's main components keyed by Penpot component id, each with its path, name, variant properties, parts by role and exceptions record, sorted so the same file always serializes the same. |
| `readLibrarySnapshot`           | function | Reads a library file from Penpot and returns its library snapshot: checks the server runs the pinned Penpot version (throwing if not), calls `get-file` without `features`, and normalizes the result with normalizeLibrarySnapshot.                                         |
| `ReadLibrarySnapshotParameters` | type     | What readLibrarySnapshot needs: the client parameters and the library file's id.                                                                                                                                                                                             |

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

<!-- api:end -->
