# @brrritscold/design-penpot-ui

The Penpot side of the component link: the **link inspector** plugin and the **link reader** `read-links.js`. Both read Penpot through one adapter (Penpot shape → normalized component → `resolveComponentLink` from `@brrritscold/design-core-js/component-link`), so they can't disagree with each other or with the drift check.

**Private and bundle-only.** Not published, ignored by Changesets, no `exports`: the build is three browser scripts, served by the `ghcr.io/brrritscold/design-penpot-static` side image. Spec: [`docs/design-system/SPEC.md` § C](https://github.com/bRRRITSCOLD/ts-packages/blob/main/docs/design-system/SPEC.md); terms: [`GLOSSARY.md`](https://github.com/bRRRITSCOLD/ts-packages/blob/main/docs/design-system/GLOSSARY.md).

## What it builds

| `dist/` path                      | Served at                       | Is                                                                     |
| --------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `link-inspector/manifest.json`    | `/link-inspector/manifest.json` | the plugin manifest (`content:read`, `library:read`; nothing to write) |
| `link-inspector/plugin.js`        | `/link-inspector/plugin.js`     | the plugin's main code (`src/plugin.ts`)                               |
| `link-inspector/ui.html`, `ui.js` | `/link-inspector/ui.html`       | the iframe UI (`src/ui/inspector.ts`)                                  |
| `read-links.js`                   | `/read-links.js`                | the link reader, minified, ending `return …readLinks(penpot)`          |

Paths in the manifest and the UI are root-absolute (`/link-inspector/…`), so they resolve the same however Penpot derives the plugin's host from the manifest URL.

## Link inspector

Install by URL in Penpot (Plugins → manager): `http://plugins.penpot.localhost/link-inspector/manifest.json` on the cluster. Select one library component or an instance (or any layer inside one) and it shows:

- the `import` lines, grouped by package;
- the JSX, props resolved from variant values, parts as nested part exports, text as children;
- each prop of the selected component and where it came from: **naming** (the convention) or **exceptions record**;
- an **Unresolved** list: variant values the value map doesn't cover, exceptions-record keys naming a variant property or slot the component doesn't have (with the shared `did you mean` hint), an invalid record (ignored, with the schema's reason).

In the JSX, `{/* unresolved: state = Hover */}`, `{/* empty slot: Body */}` (an `_internal/Slot` placeholder still showing) and `{/* page-local: Notifications/Footer */}` mark what the convention can't name.

It **shows and never edits**: the adapter's Penpot types (`PenpotShape`, `PenpotComponent`, `InspectorPenpot`) hold no write method, and the tests fail on any plugin-data write. It doesn't check against `core-react`; that's the drift check's job.

A component is a **library component** when it comes from another file (a connected library) or sits under `Components/`, `icon/` or `_internal/`, which is how the library file itself reads. Anything else is page-local.

## Link reader

`read-links.js` runs as the body of one MCP `execute_code` call; the `design-system` skill never vendors it. Don't paste the file into the call: let the call fetch it from the static host and run it, so the code always matches the served build (verified live on Penpot 2.18.6):

```js
const code = await (await fetch('http://plugins.penpot.localhost/read-links.js')).text()
return new Function('penpot', code)(penpot)
```

The sandbox's `fetch` sends a CORS preflight, which the side image answers. It returns every link on the open page:

```ts
type ReadLinksResult = {
	file: string
	page: string
	layers: { layer: string; id: string; links: LinkNode[] }[] // one per top-level layer
}
```

Each `LinkNode` is a `component` (package, export, props with their source, unresolved values, record status, hints, children), an `icon`, an `empty-slot`, a `local` page-local component, or `text`. Layout wrappers (plain boards and groups) are flattened away; hidden layers are left out.

**Visual order:** siblings sort top to bottom, and left to right when their vertical extents overlap (one row). Penpot's own child order is layer order, which isn't reading order.

It is minified and kept small (~27 KB), so it also works pasted as the call's code where the host can't be reached. That's why `design-core-js` builds the exceptions-record schema with zod's mini build.

## Tests

`unit` only, plus a manual smoke test (`ts-frontend-testing` → component library → design-penpot-ui):

- main code and adapter against a fake `penpot` built from the library snapshot fixture (`tests/fixtures/`), the plugin entry run under `vi.stubGlobal('penpot', …)`;
- the iframe UI in jsdom (`// @vitest-environment jsdom`), driven by the message the main code sends.

**Manual smoke test** (a plugin PR says it was done): install the plugin by URL in the k3s Penpot, open the design system library, select a component, and confirm the inspector shows its component link. Run `read-links.js` once over MCP on a page design. **Penpot runs one plugin at a time:** while the link inspector is open, the MCP plugin stops answering (every `execute_code` times out), so close the inspector before using MCP.

## Scripts

`build` (tsup, three IIFE bundles), `typecheck`, `lint`, `lint:check`, `test:unit`, `test:unit:watch`.
