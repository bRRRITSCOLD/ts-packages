# Which self-hostable design tool replaces Figma?

Research for [#5](https://github.com/bRRRITSCOLD/ts-packages/issues/5) on the map [#4](https://github.com/bRRRITSCOLD/ts-packages/issues/4). Gathered 2026-11-03 from primary sources (official repos, docs in those repos, release lists, Helm values, plugin API type definitions, npm registry).

**Legend:** **V** = verified against the linked primary source. **C** = claimed by the project (README/marketing) but not checked in docs or code. **U** = unknown or not found.

## Recommendation

**Penpot.** It is the only candidate that meets every hard requirement today with a shipped, documented feature: MPL-2.0, official Docker images and an official Helm chart (which already includes the MCP server), an official read/write MCP server, team shared libraries with shared tokens, Viewer/Editor/Admin roles with comments, native W3C DTCG token import/export, and per-component metadata through the plugin API's `setSharedPluginData` (plus a 300-character component annotation). It also has by far the largest community and a monthly minor release cadence.

OpenPencil is the strongest runner-up (very agent-friendly, DTCG tokens, MIT), but its self-hosted server first shipped to npm on 2026-11-02 and its documentation for it is not published yet. FigCraft is an early alpha with no accounts. Revisit both in six months.

## Comparison

| Requirement | Penpot | OpenPencil (open-pencil/open-pencil) | FigCraft (storytold/figcraft) | OpenPencil (ZSeven-W/openpencil) |
|---|---|---|---|---|
| Open source, $0 | V MPL-2.0. Enterprise plan sells only org governance on top | V MIT (Cloud is Apache-2.0) | V MIT or Apache-2.0 | V MIT |
| Self-host on k3s | V Docker Compose and official Helm chart, MCP included | Partial: `@open-pencil/cloud` with Dockerfile and compose, first npm release 2026-11-02, docs page returns 404. Editor is local-first or uses S3 directly | Partial: `figcraft-server` (preview) with a Dockerfile. No Helm, no accounts | Partial: Docker web image. No multi-user server |
| Agent read and write via MCP | V Official server. Runs code through the Plugin API, so it can create pages and components | V Official `@open-pencil/mcp` with 100+ tools, stdio or HTTP, works on files or the running app | V Official `figcraft-cli mcp`, stdio, 400+ commands | C Built-in `op-mcp` |
| Shared library across files | V Team shared libraries. A library can also be the tokens source | V Published libraries kept in an S3 bucket or on this device | V Team library on `figcraft-server` (preview) | C "UIKits" imported and exported, not served |
| Multi-user comments and edits | V Real-time server. Roles Viewer (comment) / Editor / Admin / Owner | V WebRTC P2P rooms (anyone with the link) and comments. Cloud roles are on the roadmap | V Live sessions and comment links. No accounts: the link is the access | C P2P sessions |
| Native tokens, W3C DTCG | V Native tokens following DTCG, JSON import and export. Single file uses set-name top-level keys | V Import and export W3C design tokens (2025.10) | U Variables import/export, but no DTCG in the code (only a Penpot importer) | U "Design variables with CSS sync" |
| Metadata on library component | V `LibraryComponent` extends `PluginData` (`setSharedPluginData`), plus `annotation` (300 chars) | C Figma Plugin API through `eval`. Plugin data exists internally. Code Connect is listed as not modelled | C Plugins have plugin data (docs/plugins.md). Dev Mode annotations | U |
| Maturity | 62k stars, ~360 contributors, monthly minor releases (2.13 to 2.18 in 2026), MCP in core since 2.13 | 9.6k stars, ~66 contributors, v0.x, minor about monthly, created 2026-02 | 4.2k stars, created 2026-10-09, "early alpha, ~49%" by its own estimate | 7k stars, v0.8.x |

## Penpot

### Self-hosting
- **V** Licence MPL-2.0; repo has 62k stars and 4.4k forks; latest release 2.18.5 (2026-10-26). [repo](https://github.com/penpot/penpot)
- **V** Official Helm chart [penpot/penpot-helm](https://github.com/penpot/penpot-helm), chart `penpot-1.11.5` released the same day as app 2.18.5. Its `values.yaml` has an `mcp:` section (image `penpotapp/mcp:2.18.5`, HTTP port 4401, WebSocket port 4402), and the default flags include `enable-mcp`. [values.yaml](https://github.com/penpot/penpot-helm/blob/develop/charts/penpot/values.yaml)
- **V** Official Docker Compose includes a `penpot-mcp` service (`penpotapp/mcp`). [docker-compose.yaml](https://github.com/penpot/penpot/blob/develop/docker/images/docker-compose.yaml)
- **V** Kubernetes install guide. [docs/technical-guide/getting-started/kubernetes.md](https://github.com/penpot/penpot/blob/develop/docs/technical-guide/getting-started/kubernetes.md)
- **V** Self-hosted MCP is enabled with the `enable-mcp` flag. The frontend proxies to the `penpot-mcp` container through `PENPOT_MCP_URI` and `PENPOT_MCP_URI_WS`. [configuration.md § MCP](https://github.com/penpot/penpot/blob/develop/docs/technical-guide/configuration.md)
- **V** Core is free and unlimited. The paid Enterprise plan adds Organizations, the Admin Console and governance "Modules" on top. A single user, or a team plus invitees, does not need it. [enterprise-plan](https://github.com/penpot/penpot/blob/develop/docs/user-guide/account-teams/enterprise-plan.njk)
- Heavy footprint: Postgres, Valkey/Redis, backend (JVM), frontend, exporter, and MCP. This comes from OpenPencil's comparison page, so treat it as **C**, but it matches the compose file.

### MCP and API
- **V** The official MCP server moved into the main repo (`/mcp`). The standalone repo [penpot/penpot-mcp](https://github.com/penpot/penpot-mcp) was archived on 2026-02-03. [mcp/README.md](https://github.com/penpot/penpot/blob/develop/mcp/README.md)
- **V** Architecture: MCP server, then a WebSocket, then the Penpot MCP plugin running in the user's browser tab, which runs code against the Plugin API. Tools: `execute_code`, `high_level_overview`, `penpot_api_info`, `export_shape`, `import_image` (local only). Docs say it can "read and modify your Penpot file structure (components, styles, tokens, pages, layers, etc.)". [docs/mcp/index.md](https://github.com/penpot/penpot/blob/develop/docs/mcp/index.md)
- **V** Remote (integrated) mode: each user enables MCP under Account, then Integrations, and gets an MCP key. The URL is `https://<your-penpot-domain>/mcp/stream?userToken=KEY` and uses Streamable HTTP. There is also a multi-user mode with OAuth (`PENPOT_MCP_AUTH_URI`) and Redis for running several instances. [docs/mcp/index.md](https://github.com/penpot/penpot/blob/develop/docs/mcp/index.md), [mcp/README.md](https://github.com/penpot/penpot/blob/develop/mcp/README.md)
- **V** Plugin API write surface used by MCP: `penpot.createPage()`, `library.local.createComponent(shapes)`, `availableLibraries()`, `connectLibrary(id)`, `addCommentThread(...)`, and a token catalog per library. [plugin-types/index.d.ts](https://github.com/penpot/penpot/blob/develop/plugins/libs/plugin-types/index.d.ts)
- **V** Backend RPC API with access tokens and team webhooks (documented as "relatively simple for now"). [integration.md](https://github.com/penpot/penpot/blob/develop/docs/technical-guide/integration.md)
- **V, important constraint:** an agent only reaches a file through an **open, connected browser tab**. If the tab sleeps or unloads, MCP calls fail until it reconnects. There is no headless file access through MCP. [docs/mcp/index.md § Keep the Penpot tab active](https://github.com/penpot/penpot/blob/develop/docs/mcp/index.md)
- **V** MCP is still settling: 2.17 and 2.18 fixed timeouts, frozen tabs, a WebSocket proxy issue and "MCP tokens being usable as API access tokens". 2.19 (unreleased) moves to MCP SDK v2 and drops SSE. [CHANGES.md](https://github.com/penpot/penpot/blob/develop/CHANGES.md)

### Libraries, sharing, tokens, metadata
- **V** Any file can be published as a shared library, which other files **in the same team** can connect. A file can use a connected library as its **tokens source**, and token changes reach it immediately. [libraries.njk](https://github.com/penpot/penpot/blob/develop/docs/user-guide/design-systems/libraries.njk)
- **V** Team roles: Viewer (view, comment, inspect), Editor, Admin, Owner. Teams have invitations and webhooks. [teams.njk](https://github.com/penpot/penpot/blob/develop/docs/user-guide/account-teams/teams.njk)
- **V** Tokens "adhere to the Design Tokens Format Module … a draft by the W3C DTCG". JSON import and export as a single file, multiple files or a ZIP, with sets and themes (`$themes.json`, `$metadata.json`). In a single file, the **top-level keys are set names**, so a plain DTCG file needs one wrapping set key, or the multi-file layout. Font-size units are still px-only, with rem "in upcoming releases". [design-tokens.njk](https://github.com/penpot/penpot/blob/develop/docs/user-guide/design-systems/design-tokens.njk)
- **V** Component metadata: `LibraryComponent` extends `LibraryElement extends PluginData`. It has `setSharedPluginData(namespace, key, value)` / `getSharedPluginData`, and an `annotation` string of at most 300 characters that shows on every copy and in Inspect. [plugin-types/index.d.ts](https://github.com/penpot/penpot/blob/develop/plugins/libs/plugin-types/index.d.ts), [components.njk](https://github.com/penpot/penpot/blob/develop/docs/user-guide/design-systems/components.njk)

### Maturity
- **V** Minor releases in 2026: 2.13.0 (02-03), 2.14.0 (03-24), 2.15.0 (05-12), 2.16.0 (06-11), 2.17.0 (07-22), 2.18.0 (09-23), with frequent patches. [releases](https://github.com/penpot/penpot/releases)
- **V** About 360 contributors (GitHub contributors API). The community MCP servers ([montevive/penpot-mcp](https://github.com/montevive/penpot-mcp), 241 stars) are now superseded by the official one.

## OpenPencil (open-pencil/open-pencil)

- **V** MIT, except OpenPencil Cloud, which is Apache-2.0. 9.6k stars, created 2026-02-27, latest stable v0.16.0 (2026-10-14), v0.17.0-beta.1 (2026-11-02). README status: "Active development. Usable today, with some rough edges". [repo](https://github.com/open-pencil/open-pencil)
- **V** Desktop app (Tauri) and browser PWA. Reads and writes `.fig`. Official MCP `@open-pencil/mcp` over stdio, or HTTP at `127.0.0.1:7600/mcp`, with 100+ tools. A CLI runs XPath queries and an `eval` that uses the Figma Plugin API. [README](https://github.com/open-pencil/open-pencil#ai--mcp)
- **V** Collaboration today is WebRTC peer-to-peer rooms: "anyone with the link can join", and a room is only available while a member is online. Comments are readable and writable by agents (`get_comments`, `add_comment`, `reply_to_comment`, `resolve_comment`). [llms-full.txt § Collaboration / Comments](https://openpencil.dev/llms-full.txt)
- **V** Storage is an S3-compatible bucket you own (for example MinIO). It holds documents and published component libraries. "Each document is uploaded whole … the last upload wins." [llms-full.txt § Cloud Storage](https://openpencil.dev/llms-full.txt)
- **V** Tokens: import and export W3C design tokens (2025.10 format), plus `openpencil tokens --format dtcg`. [llms-full.txt § Importing and Exporting Design Tokens](https://openpencil.dev/llms-full.txt)
- **V/C** Self-hosted server `@open-pencil/cloud` (accounts, workspaces, sharing; Postgres, S3, SMTP; Dockerfile and `compose.self-hosted.yml`) is in the repo. It was **first published to npm 2026-11-02**. Its self-hosting guide URL returns 404, and the roadmap still lists Cloud roles, team libraries and production self-hosting as "near-term" work. [packages/cloud](https://github.com/open-pencil/open-pencil/tree/master/packages/cloud), [roadmap](https://openpencil.dev/llms-full.txt)
- **U** Component metadata: plugin data exists internally ("stored as the `behaviour` field of OpenPencil's plugin data"), but I found no documented public `setSharedPluginData`. The docs list Code Connect and dev resources as "not modeled".

## FigCraft (storytold/figcraft)

- **V** MIT or Apache-2.0, pure Rust, created 2026-10-09, 4.2k stars, releases every few days (v0.10 to v0.15 between 10-22 and 11-03). README badge: "early alpha", and "about 49% of the way to replacing proprietary tools … by our own estimate". [README](https://github.com/storytold/figcraft)
- **V** MCP: `figcraft-cli mcp` over stdio, headless or attached to the running app. It exposes the same 400+ command registry as the UI, and file access is limited by read and write roots. [docs/mcp.md](https://github.com/storytold/figcraft/blob/main/docs/mcp.md)
- **V** `figcraft-server` (preview): team files, team libraries, live sessions, comment links. **No accounts:** "a share link is the access to one file"; accounts are milestone M9. A Dockerfile exists at `packaging/server/`. [docs/server.md](https://github.com/storytold/figcraft/blob/main/docs/server.md), [docs/roadmap.md](https://github.com/storytold/figcraft/blob/main/docs/roadmap.md)
- **U** DTCG: a code search finds DTCG only in the Penpot importer (`crates/format/src/penpot.rs`), not as a native format.
- Star and fork counts (4.2k / 1.6k forks in under a month) look inflated compared with its age. Treat community size as unproven.

## Others considered

- **OpenPencil (ZSeven-W/openpencil):** a different project with the same name. MIT, 7k stars, v0.8.5. Rust; `.op` files; built-in MCP; a Docker web image; P2P collaboration. No team server, no shared library service, no DTCG found. Fails the multi-user and shared-library requirements. [README](https://github.com/ZSeven-W/openpencil)
- **Grida (gridaco/grida):** Apache-2.0, 2.7k stars, v0.0.24. The README documents no self-hosting or MCP. Too early. [repo](https://github.com/gridaco/grida)

## Risks and unknowns for the Penpot choice

1. **Browser-tab dependency.** MCP needs a live, connected Penpot tab for each file. CI drift checks or unattended agents need a headless browser running the plugin, or the backend RPC API instead of MCP. This is the main design constraint for the sync ticket.
2. **Component link storage.** `sharedPluginData` on a `LibraryComponent` looks like the right home for the component link. Not yet verified: whether it survives export and import, whether it propagates to other files, and whether instances can read it. The `annotation` field (300 chars) is a human-visible fallback. A prototype should confirm this.
3. **DTCG fidelity.** Single-file import treats top-level keys as set names. Px-only font sizes and Penpot-specific extensions (math expressions) may not round-trip cleanly with the repo's DTCG file. Test the round trip.
4. **Library scope is per team.** Shared libraries connect only within one team. Put all apps' files in one team.
5. **MCP churn.** The SDK v2 move and SSE removal in 2.19, plus a run of MCP fixes, mean pinning versions (Helm chart and `penpotapp/mcp` tag) and expecting breaking changes.
6. **Resource footprint on k3s:** six services including a JVM backend and a headless-Chromium exporter. Size the node accordingly (not measured here).
