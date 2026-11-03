# What stands in for Code Connect on Penpot?

Research for [#6](https://github.com/bRRRITSCOLD/ts-packages/issues/6) on the map [#4](https://github.com/bRRRITSCOLD/ts-packages/issues/4). The tool decision (Penpot) is in [#5](https://github.com/bRRRITSCOLD/ts-packages/issues/5) and [research/design-tool.md](./design-tool.md); this file does not repeat it. Gathered 2026-11-03.

Sources are the `penpot/penpot` repo at `develop` (commit [`4173cc34`](https://github.com/penpot/penpot/tree/4173cc34ab85e0470fe1cbba3e2e24dfa0477d05), 2026-11-03), the `penpot/penpot-ai-kit` repo, the Penpot issue tracker and the Penpot community forum. Links below point at `develop`; line numbers are from that commit.

**Legend:** **V** = verified against the linked primary source (type definitions, implementation code, official docs or the issue tracker). **C** = claimed by a source but not checked in code. **U** = unknown or not found. Nothing here was tested against a running Penpot; anything that needs a live instance is listed under "What the prototype must prove".

Terms follow the glossary: **design system library** (the shared Penpot library that mirrors `core-react`), **component link** (the metadata that ties a library component to its React component), **promotion**, **design token**, **token file**.

## Recommendation

**Store the component link as `sharedPluginData` on each library component, in the library file, under one namespace (for example `brrritscold.core-react`, key `link`) whose value is a small JSON document: package, export name, and a variant-property-to-prop map. Also set the component `annotation` to a one-line human hint such as `core-react: <Button> from @brrritscold/core-react`. Name variant properties and values after React props wherever possible, so that most of the map is the identity.**

Why:

- Claude reads it in one `execute_code` call from any selected copy: `shape.component().getSharedPluginData(ns, 'link')` plus `shape.component().variantProps`. The proxy returned by `component()` points at the **library file**, and the workspace loads the full data of every connected library, so the read works in any file that uses the library, and it always sees the library's current value (not a copy that needs syncing).
- Component ids do not change on library updates or on export/import, and the component's `plugin-data` is part of the component schema that export/import encodes. So the link travels with the component.
- No native or community "Code Connect" for Penpot exists (one untriaged feature request, an unanswered forum thread). A repo-side mapping file works as a fallback, but it is a second artifact for Claude to fetch and keep in step with the library. Plugin data keeps the link next to the thing it describes.
- The annotation is the only native field a human sees (on every copy and in the Inspect tab). It holds at most 300 characters, so it suits a hint, not the full map.

## Proposed link shape (for the prototype to test, not settled)

```json
{
  "v": 1,
  "package": "@brrritscold/core-react",
  "export": "Button",
  "props": {
    "Variant": { "prop": "variant" },
    "Size": { "prop": "size", "values": { "Small": "sm", "Large": "lg" } },
    "Disabled": { "prop": "disabled", "type": "boolean" }
  },
  "children": { "layer": "label", "as": "children" },
  "docs": "packages/core-react/src/button/button.tsx"
}
```

- `props` keys are Penpot variant property names. A missing `values` means the value passes through as-is. `type: "boolean"` matches Penpot's toggle pairs (true/false, on/off, yes/no).
- `children` (or any `slots`) names a text layer inside the component whose overridden content becomes a prop, because Penpot has no text or instance-swap component properties (see below).
- Each variant is its own `LibraryComponent`, so the same JSON is written to every variant component in a set. A script does this in one `execute_code` call.

Read path for Claude (one `execute_code` call):

```js
const s = penpot.selection[0];
const c = s.component();               // LibraryComponent in the library file
return {
  componentId: c.id, libraryId: c.libraryId, name: c.name, path: c.path,
  variantProps: c.isVariant() ? c.variantProps : null,
  link: c.getSharedPluginData('brrritscold.core-react', 'link'),
  annotation: c.annotation,
};
```

## Findings

### 1. Native mechanisms on library components

#### `sharedPluginData`

- **V** `LibraryComponent extends LibraryElement extends PluginData`, which has `getSharedPluginData(namespace, key)`, `setSharedPluginData(namespace, key, value)` and `getSharedPluginDataKeys(namespace)`. Values are strings. [plugin-types/index.d.ts L3040, L3219, L3776–3858](https://github.com/penpot/penpot/blob/develop/plugins/libs/plugin-types/index.d.ts)
- **V** Namespace rules: the only check is that namespace and key are strings. Shared data is stored under the keyword `:shared/<namespace>`. Private `setPluginData` is stored under `:plugin/<plugin-id>` and is readable only by the same plugin, so the MCP plugin's private data would not be readable by any other plugin or a later MCP plugin id. Use the shared form. [frontend/src/app/plugins/library.cljs L976–1018](https://github.com/penpot/penpot/blob/develop/frontend/src/app/plugins/library.cljs)
- **V** Stored on the component itself: `schema:component` has `[:plugin-data {:optional true} ctpg/schema:plugin-data]`. Plugin data is a map from namespace keyword to a map of string keys to string values. [common/src/app/common/types/component.cljc L32](https://github.com/penpot/penpot/blob/develop/common/src/app/common/types/component.cljc), [common/src/app/common/types/plugins.cljc](https://github.com/penpot/penpot/blob/develop/common/src/app/common/types/plugins.cljc)
- **U** Size limit: no length limit in the schema or the setter. Practical limits (file size, change payloads) were not found. Keep values small (well under a few KB).
- **V** Writes are only allowed to the **current file's** library: `setSharedPluginData` on a component rejects with `setSharedPluginData-non-local-library` when `file-id` is not the current file, and also needs the `library:write` permission. So the link is written by opening the library file itself. [library.cljs L989–1008](https://github.com/penpot/penpot/blob/develop/frontend/src/app/plugins/library.cljs)
- **V** History: before 2.17 writes to a connected library looked successful and were then lost; 2.17.0 made them fail loudly. The issue text also says "plugin data is never carried by library synchronization". [penpot#10629](https://github.com/penpot/penpot/issues/10629), [CHANGES.md 2.17.0](https://github.com/penpot/penpot/blob/develop/CHANGES.md). 2.17.0 also fixed a validation error when listing shared plugin data keys ([penpot#10628](https://github.com/penpot/penpot/issues/10628)).
- **V** Readable from a copy in another file: `shape.component()` builds the component proxy with `(:component-file head)`, the library's file id, not the current file. [frontend/src/app/plugins/shape.cljs L1542–1548](https://github.com/penpot/penpot/blob/develop/frontend/src/app/plugins/shape.cljs). `getSharedPluginData` then looks the component up in `state[:files <library-id> :data :components]` ([plugins/utils.cljs L65–68](https://github.com/penpot/penpot/blob/develop/frontend/src/app/plugins/utils.cljs)), and the workspace loads every connected library's full file into `state :files` on open (`fetch-libraries` → `libraries-fetched`; [workspace.cljs L176–188](https://github.com/penpot/penpot/blob/develop/frontend/src/app/main/data/workspace.cljs), [workspace/libraries.cljs L1653–1660](https://github.com/penpot/penpot/blob/develop/frontend/src/app/main/data/workspace/libraries.cljs)). Consequence: a copy does not carry the link; reading it always resolves through the live library. **V** from code, not tested live.
- **V** Plugin data on the main-instance **shape** (as opposed to the component) is not one of the synced attributes (`sync-attrs` in component.cljc has no `plugin-data`), so do not store the link on the main shape and expect copies to have it. [component.cljc](https://github.com/penpot/penpot/blob/develop/common/src/app/common/types/component.cljc)
- **V** Survives export/import: the `.penpot` (binfile v3) exporter encodes each component with `schema:component`, which includes `plugin-data`. [backend/src/app/binfile/v3.clj L128, L409](https://github.com/penpot/penpot/blob/develop/backend/src/app/binfile/v3.clj). On import, only **file** and **media** ids are regenerated (`update-index` over `:files` and media), and copies' `:component-file` references are relinked; component ids are kept. [backend/src/app/binfile/common.clj L145–172, L656–661](https://github.com/penpot/penpot/blob/develop/backend/src/app/binfile/common.clj), [v3.clj L971, L1241](https://github.com/penpot/penpot/blob/develop/backend/src/app/binfile/v3.clj). So the **library file id changes** on import, **component ids do not**. **V** from code, not tested.
- **V** Survives library edits and publish/unpublish: Penpot libraries are not versioned snapshots. Publishing marks the file shared; the data stays in the one library file, and consumers read it live. [libraries.njk](https://github.com/penpot/penpot/blob/develop/docs/user-guide/design-systems/libraries.njk). Unpublishing disconnects consumers, and their copies stop being linked, so the link becomes unreachable from them (same source).
- **V** Plugin data is in the documented file format (`pluginData` on files, pages, shapes, components, colors, typographies). [penpot-file-format.md § Plugin Data](https://github.com/penpot/penpot/blob/develop/docs/technical-guide/developer/data-model/penpot-file-format.md)
- **U** Human visibility: no UI for plugin data was found. Treat it as invisible to people.

#### `annotation`

- **V** `LibraryComponent.annotation: string | null`, at most 300 characters; setting it needs `library:write` and a live component in the current file's library. [index.d.ts L3040–3047](https://github.com/penpot/penpot/blob/develop/plugins/libs/plugin-types/index.d.ts), [library.cljs L867–890](https://github.com/penpot/penpot/blob/develop/frontend/src/app/plugins/library.cljs)
- **V** "The annotations are shown in every component copy" and "are also shown at the Inspect tab". [components.njk L117–124](https://github.com/penpot/penpot/blob/develop/docs/user-guide/design-systems/components.njk)
- **V** Readable from a copy through the same `component()` proxy, which reads the library's component. [library.cljs L867–868](https://github.com/penpot/penpot/blob/develop/frontend/src/app/plugins/library.cljs)
- **C** Survives export/import: stored as `:annotation` on the component map ([components_list.cljc L36–90](https://github.com/penpot/penpot/blob/develop/common/src/app/common/types/components_list.cljc)), but it is not named in `schema:component`. Malli maps are open, so it is probably kept, but this was not traced through the encoder.
- Fit: good as a human hint, too small and free-form for a reliable prop map. Designers can also edit it in the UI, which is good for humans and bad for a machine contract.

#### Variants and component properties

- **V** Penpot's only component-property mechanism is **variants**: named properties with string values, where each combination is a separate component (`[property]=[value], …`). Boolean-looking pairs (true/false, on/off, yes/no) get a toggle in the UI. [variants.njk](https://github.com/penpot/penpot/blob/develop/docs/user-guide/design-systems/variants.njk)
- **V** Plugin API read access: `LibraryComponent.isVariant()`, `LibraryVariantComponent.variantProps: { [property]: string }`, `.variants: Variants` with `properties: string[]` and `currentValues(property)`. A copy's `component()` returns the specific variant component the copy points at, so `variantProps` gives that copy's selected values. [index.d.ts L3096–3130, L6060–6110](https://github.com/penpot/penpot/blob/develop/plugins/libs/plugin-types/index.d.ts), [library.cljs L1041–1050](https://github.com/penpot/penpot/blob/develop/frontend/src/app/plugins/library.cljs), [shape.cljs L1542–1548](https://github.com/penpot/penpot/blob/develop/frontend/src/app/plugins/shape.cljs)
- **U/V** No Figma-style text, boolean or instance-swap component properties were found in the type definitions or docs. Text content and nested swaps exist only as overrides on the copy's layers (readable by walking the copy's children; nested copies have their own `component()`). Swapping is documented. [components.njk § Swap components](https://github.com/penpot/penpot/blob/develop/docs/user-guide/design-systems/components.njk)
- Fit: variants carry the **values** (which variant/size/state a copy uses), and Claude can read them, but they do not carry the import path or the React prop names. They are half of the link, not all of it.

### 2. What Penpot's MCP exposes

- **V** Tools: `execute_code`, `high_level_overview`, `penpot_api_info`, `export_shape`, `import_image`, `submit_feedback` (plus dev-only tools). No code-generation or code-mapping tool. [mcp/packages/server/src/tools](https://github.com/penpot/penpot/tree/develop/mcp/packages/server/src/tools)
- **V** `execute_code` runs arbitrary JavaScript against the Plugin API in the connected tab, and the MCP plugin holds `content:read/write`, `library:read/write`, `comment:read/write` and `user:read`. So it can read `component()`, `getSharedPluginData`, `annotation` and `variantProps`, and in the library file it can write them. [mcp/packages/plugin/public/manifest.json](https://github.com/penpot/penpot/blob/develop/mcp/packages/plugin/public/manifest.json), [ExecuteCodeTool.ts](https://github.com/penpot/penpot/blob/develop/mcp/packages/server/src/tools/ExecuteCodeTool.ts)
- **V** The built-in helper `penpotUtils.shapeStructure` already reports `componentInstance.{componentId, componentName, mainInstanceId}` for copies, but **not** variant props, annotation or plugin data. A skill must tell Claude to read those explicitly. [mcp/packages/plugin/src/PenpotUtils.ts L61–72](https://github.com/penpot/penpot/blob/develop/mcp/packages/plugin/src/PenpotUtils.ts)
- **V** The server's instructions come from fixed files (`data/initial_instructions.md`, `data/base_instructions.md`); there is no setting to add project-specific instructions. They do mention `instance.component()` and `variantProps`. The guidance for the component link therefore belongs in the personal-ai skill, not in the server. [ConfigurationLoader.ts](https://github.com/penpot/penpot/blob/develop/mcp/packages/server/src/ConfigurationLoader.ts), [initial_instructions.md](https://github.com/penpot/penpot/blob/develop/mcp/packages/server/data/initial_instructions.md)
- **V** Built-in codegen exists in the Plugin API (`penpot.generateMarkup` for HTML/SVG, `penpot.generateStyle` for CSS), but it emits generic markup, not component usage. [index.d.ts L1468–1506](https://github.com/penpot/penpot/blob/develop/plugins/libs/plugin-types/index.d.ts)
- **V** (from #5) MCP needs an open, connected Penpot tab. Reading the link through MCP has the same constraint.

### 3. Existing Code Connect equivalents

- **V** Official: none shipped. Feature request [penpot#11360 "Add Code Connect-like mapping between Penpot components and production code"](https://github.com/penpot/penpot/issues/11360) was opened 2026-08-25 by a community member, is labelled `needs triage`, has no comments and no assignee. It proposes almost exactly the JSON shape above.
- **V** Forum: ["Figma Code Connect: does exists in Penpot?"](https://community.penpot.app/t/figma-code-connect-does-exists-in-penpot/10411) (2026-03). Replies are from community members only; one points at MCP, the asker says MCP is not the same thing, and a 2026-09-18 follow-up asking for news has no answer.
- **V** Official [penpot/penpot-ai-kit](https://github.com/penpot/penpot-ai-kit) (v0.5.1, last commit 2026-10-07) has a `penpot-design-to-code-review` skill whose code side is "supplied by the user or by another MCP" and matched by layer names; it has no stored component link. Its skills use `setSharedPluginData` (namespace `penpot-ai`) as an in-file ledger, which shows the pattern in use by Penpot's own agent tooling. [skills/penpot-design-to-code-review/references/02-mapping-to-source.md](https://github.com/penpot/penpot-ai-kit/blob/main/skills/penpot-design-to-code-review/references/02-mapping-to-source.md), [AGENTS.md](https://github.com/penpot/penpot-ai-kit/blob/main/AGENTS.md)
- **U** Community plugins or projects: GitHub repo searches for "penpot code connect", "penpot codeconnect", "penpot component mapping react" and "penpot storybook" returned nothing relevant. A web search found commercial design-to-code generators (for example Locofy listings) that generate new components rather than map to existing ones (**C**, not checked).

### 4. Repo-side fallback: a mapping file

Shape: `packages/core-react/component-links.json` (or one co-located `*.link.json` per component), keyed by **library component id** with the library component name/path as a readable secondary key, holding the same JSON as above. Claude reads it from the repo (filesystem) alongside the MCP read of `component().id` and `variantProps`.

- **Pros:** code is the source of truth (matches the map's standing decision); reviewable in PRs, versioned with Changesets alongside `core-react`; typecheckable against the component's props in CI; no dependency on Penpot behaviour.
- **Cons:** two reads (MCP plus repo) and only works when Claude has the repo checked out, which an outside designer's agent may not; drift between file and library (a renamed or recreated component gets a new id, so the entry silently stops matching); nothing visible to a human in Penpot.
- **Id stability, V from code:** component ids are kept across library edits, publish, and export/import (only file and media ids are regenerated). They change when a component is deleted and recreated, or duplicated. Variant switching on a copy changes which component id it points at (each variant is its own component), so a file keyed by id needs one entry per variant, or keying by the variant set (`variants.id`) plus property values. **U** whether ids are kept when a library file is duplicated (not traced).
- Keying by library name plus component path is more readable but breaks on renames.

The repo file and plugin data are not exclusive: the sync ticket may decide to generate the plugin data from a repo file (code as source of truth). This research only says where Claude reads it.

## Options vs requirements

| Option | Claude-readable via MCP | Visible across files using the library | Survives library updates / export | Human-visible | Effort |
|---|---|---|---|---|---|
| `sharedPluginData` on library component | V yes, one `execute_code` via `component()` | V yes, read live from the library file (code path) | V ids and data kept on edit and export/import (code); write needs the library file open | U no UI | Low: a script writes it; a skill reads it |
| `annotation` | V yes | V yes, shown on every copy | V on edit; C on export | V copies + Inspect | Very low, but 300 chars and free text |
| Variants / properties | V yes, `variantProps`, `variants.properties` | V yes | V | V Design tab | Low; carries values only, no import path or prop names |
| Repo mapping file (keyed by component id) | Indirect: MCP gives id, file comes from the repo | Only if the reader has the repo | Ids stable (V), but drifts silently on recreate/rename | In code review only | Low to medium; needs a drift check |
| Existing community/official tool | None exists (#11360 untriaged) | n/a | n/a | n/a | n/a |

## What the prototype must prove

For "Does a component link let Claude build correct core-react code from a design?":

1. **Write:** via MCP, in the library file, set `sharedPluginData` and `annotation` on a variant set (every variant component); reload; values persist.
2. **Cross-file read:** in a second file of the same team that uses the published library, select a copy and read `component().getSharedPluginData(...)`, `annotation` and `variantProps` through `execute_code`. Confirm it works without the library file open in another tab.
3. **Updates:** edit the link in the library and confirm the consumer sees the new value without accepting an update; swap a copy's variant and confirm the read follows; export and re-import the library and confirm component ids and the link survive.
4. **Prop mapping:** that variant props plus the `children`/slot convention are enough to cover text, booleans, icons (nested copies with their own links) and composition for 3–5 representative components, and that Claude produces type-correct `core-react` JSX from a screen built with them (`tsc` passes against the real props).
5. **Ergonomics:** one `execute_code` that walks a selection and returns every copy's link, so the skill can do a whole screen in a single call; check size and speed on a realistic screen.
6. **Pin versions:** run on the pinned Penpot version; re-check after 2.19 (MCP SDK v2).

## Open risks

- Behaviour is verified from code, not from a running instance. The cross-file read in particular depends on connected libraries being fully loaded into the workspace, which is how the current code works but could change.
- Plugin data writes to connected libraries were silently lost until 2.17. Pin Penpot at 2.17 or later.
- No human UI for plugin data: a designer cannot see or fix a wrong link without an agent, except through the annotation hint, which can drift from the plugin data.
- Penpot has only variant properties, so text content, icons and slots need a convention (the `children`/slots fields), not a native mapping.
- Each variant is its own component, so the link is duplicated across every variant in a set; a write script must keep them identical.
- MCP needs an open tab, so any automated check that the links match `core-react` props (sync ticket) needs a headless tab or the backend RPC API.
