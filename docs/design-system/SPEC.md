# Spec: self-hosted design system linked to core-react

A self-hosted replacement for Figma + Code Connect: **Penpot** on this machine's k3s, a design system library in Penpot that mirrors **`@brrritscold/core-react`**, a component link Claude reads over MCP, a drift check that keeps the two honest, and the personal-ai skills that tell agents how to work in all of it.

This spec is the destination of the map [Wayfinder: self-hosted design system linked to core-react][map]. It says **what to build and in what order**. The reasons behind each choice live in the decision tickets, linked from every phase as _Decided in_. Read a ticket when you need to know why or need the full rule text; you shouldn't need it to know what to build. Terms are defined in [`GLOSSARY.md`](GLOSSARY.md).

Where a later ticket amended an earlier one, this spec states the amended result and links both.

## Repos

| Repo                      | Visibility       | Holds                                                                                                                       |
| ------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `bRRRITSCOLD/ts-packages` | public           | `core-react`, the four private `design-*` packages, the side-image sources and their GHCR workflow, this spec, the glossary |
| `personal-ai`             | public plugin    | the testing skills, the three new skills, router/README/naming/layout edits                                                 |
| `personal-infra`          | **private, new** | `penpot/` (kustomize manifests, backup, runbooks), `tailscale/policy.hujson`                                                |

No employer references in any of them.

## Pins

| Thing                      | Pin                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------- |
| Penpot                     | **2.18.6**, chart `penpot-1.11.7`, image tags from the chart (no per-image overrides) |
| Postgres / Valkey          | 16 (exact patch tag pinned at build) / 8.1                                            |
| k3s (as found)             | v1.34.6, one node, 16 cores, 29 Gi RAM                                                |
| Vitest                     | one root `vitest@^4` in ts-packages, never a second version                           |
| React / Tailwind           | `react`, `react-dom` ^19 / `tailwindcss` ^4                                           |
| Base UI                    | `@base-ui/react`; the traps below were verified against 1.9.0                         |
| Storybook                  | current major at build time                                                           |
| Style Dictionary           | v4+ (native DTCG)                                                                     |
| `core-react` first publish | `1.0.0`                                                                               |

## Build order

Two tracks run in parallel until they meet at `core-react`.

```
Track A (code + skills)                 Track B (this machine)
A1 ts-packages: Vitest migration        B1 host prep + personal-infra repo
A2 personal-ai: backend testing skills  B2 Penpot deploy
A3 personal-ai: ts-frontend-testing     B3 profiles + credentials
A4 personal-ai: three new skills
            \                          /
             C  ts-packages: design-* packages + side images   (needs A1, B3)
             D1 core-react scaffold + empty library + drift check wired
             B4 side workloads + backup on the cluster; full acceptance
             D2 core-react day-one component set, each in lockstep with its library twin
             D3 first release 1.0.0
             Operating: runbooks
```

Hard ordering constraints from the decisions: A1 lands before anything else in ts-packages uses Vitest; A2 merges right after A1; A3 after A2; A4 after A3; all of A before `core-react` is built. Nothing of `core-react` is published before D3.

---

## A1 — ts-packages: move from mocha + chai to Vitest

One **test-only PR** migrating `core-js`, `core-node`, `core-express`, `testing-core-js`, `testing-core-node`. No changesets, no release (published helpers don't depend on mocha).

- Root devDeps: `-mocha -chai -@types/mocha -@types/chai -sinon -@types/sinon -nodemon +vitest@^4`.
- Root `vitest.shared.ts`. Each package gets one `vitest.config.ts` building on it, with three `test.projects` — `unit`, `integration`, `e2e` — each selected by file suffix (`.unit.test.ts`, `.integration.test.ts`, e2e suffix unchanged).
- Scripts keep their names: `test:<tier>` → `vitest run --project <tier>`, `test:<tier>:watch` → `vitest --project <tier>`. Delete `nodemon.*.test.json`.
- `:setup` / `:teardown` / `:ci` container scripts stay as plain tsx scripts (including the `process.exit(0)` gotcha). **No `globalSetup`.** The `integration` project's `setupFiles` loads `.env.integration.test`, replacing `before(setup)` in each file.
- Timeouts: unit keeps Vitest's 5 s default; integration and e2e set `testTimeout` and `hookTimeout` to 120 s. `--timeout 99999999 --exit` is gone.
- Hooks: `before`→`beforeAll`, `after`→`afterAll`, `beforeEach`/`afterEach` unchanged, root hooks → `setupFiles`, `context` → `describe`, `this.timeout` → `{ timeout }`. Everything imported from `vitest`; no `globals: true`.
- Assertions: Jest-style `expect` only (chai-style assertions are rewritten, not left). Doubles: `vi.fn` / `vi.spyOn`.
- `testing-core-node`'s separate nock run is removed (per-file isolation covers it).

**Acceptance:** the CI `check` and `integration` jobs pass **unchanged**; no mocha, chai, sinon or nodemon in the lockfile; no chai-style `expect(...).to`.

_Decided in:_ [How do ts-packages and the testing skills move from mocha + chai to Vitest?][t15]

## A2 — personal-ai: backend testing skills

One personal-ai PR, merged right after A1, so the skills never describe a repo state that doesn't exist. Framing everywhere: many runners exist, **Vitest is today's example**; mocha is never documented as a fallback.

- **`pragmatic-tdd`:** hook roles named independently of any runner — **once-before / each-before / each-after / once-after** — with a mapping table, one column per runner (Vitest only). Pairing, isolate-by-key and **no skip path** (`ctx.skip()` banned like `this.skip()` was) stated in terms of roles. Update the description trigger, runner lines, house assertion line ("Vitest's `expect`"), naming wording (`file > describe > it`). Rewrite the example file in Vitest, labelled as an example.
- **`ts-backend-testing`:** opens with a **runner contract** (select a tier by file suffix, one config entry per tier, a finite timeout per tier, per-tier env loaded before tests, watch mode, setup/teardown/ci scripts unchanged), then a **"Vitest (current)"** section (config example pointing at ts-packages' `vitest.shared.ts`, scripts, hooks, a new **Assertions and doubles** part). Delete the `--exit`/long-timeout paragraph and the `function(){}`/`this` rule. Stays TypeScript-only.
- **`ts-backend-testing` also gains the `design-*` Node conventions:** `design-core-js` and `design-core-node` are unit-tested (the latter on fixture `.d.ts` and snapshot files); `design-penpot-sdk-node` has integration tests against **nock-replayed `get-file` recordings**, committed and pinned to a Penpot version, plus an opt-in `e2e` tier against the k3s Penpot that never runs in hosted CI.
- **`ts-package-layout`:** root tooling list as in A1; skeleton `nodemon.{unit,integration,e2e}.test.json` → `vitest.config.ts`; script-contract rows; `vitest.shared.ts` listed with the root configs.

_Decided in:_ [How do ts-packages and the testing skills move from mocha + chai to Vitest?][t15], [What changes does ts-frontend-testing need for core-react and Penpot?][t16]

## A3 — personal-ai: rewrite `ts-frontend-testing`

Its own personal-ai PR, after A2, before `core-react`. **Rewritten from scratch**, one skill with two halves, stating only where it diverges from the runner contract. The local archive is used for structure only; **no file is copied** from it, and nothing from a previous employer survives.

**Keeps (as principles):** choosing a tier; fixtures are functions, typed off what the app consumes, `nextId()`; a per-worker fake store keyed by port; `faultNext` / `runRoute` / `pendingFaults`; minted personas; `.invalid` origins; asserting toast text; shooting captures on a settled page; the bar of 20 clean runs at full worker count; a small **tier-placement convention test** (suffix matches directory, no `.skip`, `test.fixme` allowed); a generic **deployed tier** (only what fakes can't prove, nightly or on demand, never gates a PR).

**Drops:** the old suite's lore, the census ratchet (`DEFERRED`, `RETIRES WITH`, `__archive__`), the import-boundary test, `json-editor`.

**App half (Next.js):**
- `unit`: Vitest + testing-library on jsdom. A unit setup file stubs `fetch` to throw ("network in unit tier: write an integration spec").
- The fake-upstream and server harness is stated as a **contract** (store per worker keyed by port; `faultNext`, `getCalls`, `pendingFaults`; `disableNetConnect()`; `.invalid` origins; minted session; standalone staging; generated, fully synthetic env file). The first app writes it; it becomes a package (e.g. `@brrritscold/testing-next-node`) when a second app needs it. Stays on **nock** (v14 intercepts `fetch`).
- Testids: the app convention `[app]__[component]__[x]` and an `ids` module with a closed `Kind` union.
- **Captures:** `playwright.capture.config.ts`, projects = viewport (390×844, 1440×900) × theme (light, dark via Playwright `colorScheme`); one `tests/captures/<surface>.capture.ts` per surface, outside the PR gate; PNGs to `test-results/captures/`, not committed.
- **Design comparison:** `test:captures:compare`, local and on demand, never in CI. Each capture file names its Penpot boards: `design: { fileId, pageId, boards: { mobile, desktop } }`. It logs in as the automation profile (`login-with-password`; the exporter rejects access tokens), calls the exporter (`POST /api/export`, `export-shapes`, `wait: true`, transit+json) at the capture's `deviceScaleFactor`, flattens the transparent PNG onto the token background colour, and writes a human side-by-side at `test-results/captures/compare/index.html` (rows surface × viewport, columns Penpot / app). **No pixel diff.** Dark is compared only when the design has a dark board. Credentials come from the process env (`PENPOT_URL`, `PENPOT_AUTOMATION_EMAIL`, `PENPOT_AUTOMATION_PASSWORD`), not a repo `.env` (see B3).

**Component library half (`core-react`):**

| Tier          | Files                                     | Runner                                                                                                                                    | Gates PR |
| ------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `stories`     | `*.stories.tsx` (the story is the test)   | Vitest browser mode via `@storybook/addon-vitest`; `@storybook/addon-a11y` fails on violations (per-story opt-out needs a written reason) | yes      |
| `unit`        | `tests/unit/*.unit.test.ts(x)`            | Vitest, jsdom; utils and hooks via `renderHook`                                                                                           | yes      |
| `integration` | `tests/integration/*.integration.spec.ts` | Playwright against a static `storybook build`                                                                                             | yes      |

- Anything with visible output is a story with a `play` function. `core-react` has no capture runner; Storybook is its visual surface.
- **Component objects** at `@brrritscold/core-react/testing`: plain factories taking a root `Locator` (`dialog(root)`, `combobox(trigger)`, `toast(page)`, …), no Playwright fixtures; apps register them through their own `test.extend`. Day one: Dialog (+ Alert Dialog), Combobox (incl. `multiple`), Select, Popover, Toast, the data table. Others are added when a trap is paid for.
- `core-react` ships no testids; components forward `data-testid` to parts (never Root, which usually renders no DOM).
- **Base UI traps**, each encoded in a component object and proven in the `integration` tier:
  1. Escape closes only the top layer; Select and a modal Popover put a backdrop over the page, so a backdrop click closes only the popup. Non-modal Popover and Combobox are **unverified** — the "Combobox / Popover in Dialog" stories settle it.
  2. Scope in-dialog lookups to the dialog: outside elements get `aria-hidden`, not `inert`; the toast viewport is exempt.
  3. Toast: each toast is a `dialog` inside `region "Notifications"`; high priority is an `alertdialog`, `aria-hidden` until focused, with a separate hidden `role="alert"` announcer. Assert **text and priority**.
  4. Combobox options carry no value attribute: find and filter by label. In `multiple`, a pick clears the filter and **closes the popup** (kept); `select(...labels)` reopens per label.
  5. Exit animations keep a closed popup mounted (`data-ending-style`): assert with auto-wait `toBeHidden()`, never an immediate count.
  6. Select has hidden inputs: never `fill()` them; drive the trigger.
  7. `data-testid` reaches parts, not Root.
- **`design-penpot-ui`** (the Penpot plugin): main code unit-tested against a fake `penpot` global built from the library snapshot; iframe UI tested in jsdom; live check is a manual smoke test installing the plugin by URL.

_Decided in:_ [What changes does ts-frontend-testing need for core-react and Penpot?][t16] (amends [What shape does @brrritscold/core-react take?][t10-testing] with `./testing`)

## A4 — personal-ai: three new skills

One personal-ai PR, after A3, before `core-react` is built. It also carries the router, README and sibling-skill edits. The skills describe `core-react` and the `design-*` tooling as specified here, ahead of their existence; that is intended.

### `ts-frontend-app`

Description:
> Use when building or changing a Next.js frontend app (`<platform>-ui`): laying out `app/` routes, choosing server vs client components, calling a platform API through its `-sdk-js` client, wiring env config, consuming `@brrritscold/core-react` (styles, icons, forms, data tables, theming), or turning a Penpot screen into app code. For tests load ts-frontend-testing; to add a component to core-react see ts-component-library.

Sections:
1. **Layout** — standalone `<platform>-ui` repo outside ts-packages, `app/` routes, `src/` modules (components, sdk clients, env); mirrors `ts-api-service`.
2. **Server vs client components** — server by default, `"use client"` at the interactive leaf.
3. **Calling the platform API** — the `-sdk-js` client is created server-side (server components, route handlers, server actions); the browser never fetches upstream.
4. **Config** — server-only env vs `NEXT_PUBLIC_`, one env per tier.
5. **Using core-react** — `@brrritscold/core-react` and `@brrritscold/core-react/icons` in `optimizePackageImports`; one `@import "@brrritscold/core-react/styles.css"`; `<Name>Icon` from `/icons`; `useDataTable` vs hand-rolled tables on the same primitives; react-hook-form → `Field` via `Controller`; `next-themes` toggling `.dark`. Never restyle around tokens. A missing component means promotion, not a local fork.
6. **From a design** — load `design-system` and read links there; app side only: a slot placeholder becomes children, page-local parts stay in the app until promoted. A raw value in a design maps to the token whose value matches exactly in the active theme, or is flagged; never an arbitrary Tailwind value, never the nearest token.
7. **Pinning core-react** — rule text from [the release ticket][t28]: pin `^x.y.z` (lockfile holds the exact version; no Dependabot/Renovate for it); **bump to latest in its own commit before building UI from a page design**, then run tests and captures; on a major, work through each changeset's `### Migration` in version order and rewrite token utility classes from `design/token-migrations.json`; when the design is ahead of any release (check the installed `.d.ts`, not the snapshot), stop on that piece, report what's missing and which PR would release it, build the rest, leave a clearly marked stub, **never a local stand-in**.
8. **Testing** — defers to `ts-frontend-testing`; cross-references component objects via the app's `test.extend`, the harness contract, captures naming their Penpot boards, `test:captures:compare`.
9. **Not covered** — auth and deployment (no decision exists; say so).

### `ts-component-library`

Description:
> Use when building or changing `@brrritscold/core-react`: vendoring a shadcn (Base UI) component, keying cva variants to Penpot variant properties, exporting compound parts, adding an icon, story or component object, editing the token file and its Style Dictionary build, or releasing it. Covers where core-react departs from ts-package-layout. For using it in an app see ts-frontend-app; for the Penpot side see design-system.

Sections:
1. **What lives here** — exports `.`, `/icons`, `/data-table`, `/styles.css`, `/tokens.json`, `/testing`. Every library component is an export; nothing app-specific.
2. **Where core-react departs from ts-package-layout** — ESM-only unbundled `tsc`, the one allowed root entry (a pure barrel), CSS/JSON exports, Storybook as the docs.
3. **Adding a component** — the D2 checklist below.
4. **Icons** — `lucide-react` re-exported from `/icons` as `<Name>Icon`.
5. **Data table** — `useDataTable` in `/data-table`; engine-agnostic primitives in `.`.
6. **Tokens** — the DTCG file, semantic names = shadcn variables, the Style Dictionary build, code wins, token sync after a change, and the **applied-token rule** quoted verbatim (see D2).
7. **The code manifest and drift** — what the drift check reads from the `.d.ts`, which changes go red, lockstep with the library fix.
8. **Releasing** — rule text from [the release ticket][t28] (see D3).
9. **Testing** — pointer to the Component library half of `ts-frontend-testing`.

### `design-system` (SKILL.md + `penpot.md`)

Description:
> Use when reading or changing the shared design library in Penpot: implementing a screen from a design, reading component links, filling slot placeholders, syncing tokens, promoting a page-design part into the library, refreshing the library snapshot, fixing a red drift check, or comparing captures with the design. Covers the component-link naming convention and every exception key, the promotion workflow and Penpot's limits. For the code side see ts-component-library.

No `ts-` prefix (it isn't TypeScript) but routed through `/ts design`. An **operator's manual** for an agent doing design work; building the `design-*` packages stays with the `ts-*` skills and their READMEs.

1. **The two sides** — the design system library mirrors the component library; code wins. Page designs vs the library.
2. **Reading a design** — fetch the link reader from `<inspector-url>/read-links.js` at use time (never vendored), run it in one `execute_code` call in the MCP tab. States the naming convention and defines **every exception key** (value maps, `slots`, package). References by role, never by layer name.
3. **Slot placeholders** — swap `_internal/Slot` for a local component.
4. **Editing the library** — only through promotion, token sync or a lockstep fix. Compound parts are copies of library components, never plain named layers. Every MCP edit is followed by a snapshot refresh committed into the `core-react` PR. The **applied-token rule** verbatim.
5. **Token sync** — rule text from [the release ticket][t28] and [the token-binding ticket][t20] (see Operating → Token sync).
6. **Promotion** — the workflow in Operating → Promotion.
7. **Drift check** — the rules listed inline so agents can predict failures, naming `design-core-js` as their source of truth. A red drift check on a refresh PR means revert the library edit; code → library gaps are a coverage report.
8. **Design comparison** — local side-by-side against Penpot exporter PNGs as the automation profile.
9. **Setup** — the user-scope MCP config line (`http://penpot.localhost/mcp/stream?userToken=${PENPOT_MCP_KEY}`), **one agent session drives Penpot at a time**, the "create an app team" steps including the automation-profile invitation checklist, and the outside-designer rule "library changes only through promotion".
10. **`penpot.md`** (reference) — MCP works only through an open tab; one key drives one tab, so the agent switches files one at a time; the pinned Penpot version; the plugin API writes only to the open file (no `openFile`); no move-to-library (pasting a main across files mints a new id); `swapComponent` works on copies only; library updates are accepted by hand in the UI, token changes apply immediately; plugin data refreshes on file load, not live; the link inspector is installed by URL; how access tokens and the automation profile are handled.

### Edits to existing personal-ai files (same PR)

- **`/ts` router** (`commands/ts.md`): add `app` → `ts-frontend-app`, `component-library` → `ts-component-library`, `design` → `design-system`; drop "frontend is out of scope".
- **README:** the two `ts-` skills in the TypeScript table; a new **Design** section for `design-system`; drop "Other frontend work is out of scope".
- **`ts-package-naming`:** drop "frontend is out of scope" from the description; add the optional **tool** segment `@brrritscold/[<platform>-][<tool>-][testing-]<kind>-<runtime>`; add `react` as a runtime and a `core-react` row (shared, browser + SSR, React peer; follows the `core-express` precedent).
- **`ts-package-layout`:** a one-line pointer to `ts-component-library` for `core-react`'s deviations, and the note that `core-react` is the **only** package allowed a root `.` entry (allowlisted in `scripts/check-entries.mjs`).

_Decided in:_ [What do the new personal-ai frontend-app and design skills cover?][t12] (amended by [credentials][t30-amend-skill]); rule text from [How do library components get bound to tokens?][t20] and [How does a design library change relate to a core-react release, and how do apps pin both?][t28]; promotion from [How does promotion work end to end?][t11]; naming segment from [Should the component link ship as a reusable open-source Penpot Code Connect?][t14]; root-entry exception from [the core-react follow-up][t10-root].

---

## B1 — Host prep

1. Create the private repo **`personal-infra`**.
2. Re-enable k3s's bundled **Traefik and servicelb**: remove `--disable=traefik --disable=servicelb` from the k3s unit, restart k3s. (Documented one-time host step.)
3. Leave the prototype namespace `penpot-proto` running until B2 passes, then delete it (nothing is migrated; the library is built fresh).

## B2 — Penpot on k3s

Manifests at **`personal-infra/penpot/`**. Install: `kubectl apply -k penpot/overlays/local`.

```
penpot/
  base/
    kustomization.yaml
    namespace.yaml            # penpot
    storageclass.yaml         # local-path-retain
    postgres.yaml  valkey.yaml
    helmchart.yaml            # HelmChart penpot 1.11.7, spec.valuesSecrets → penpot-values
    values.yaml               # real chart values, portable to `helm install -f`
    traefik-config.yaml       # HelmChartConfig (timeouts)
    static.yaml               # added in B4
    snapshot-refresh.yaml     # added in B4
  backup/                     # added in B4
  overlays/
    local/
      kustomization.yaml
      postgres-apparmor.yaml
    outside-access/           # dormant, see B4
  RESTORE.md                  # B4
  OUTSIDE-ACCESS.md           # B4
```

- **Chart:** `penpot-1.11.7` through a k3s `HelmChart` (no `helm` binary). `values.yaml` becomes Secret `penpot-values` via a kustomize `secretGenerator` (`disableNameSuffixHash`), read through `spec.valuesSecrets`; if that field doesn't work on this k3s, fall back to inline `valuesContent`.
- **`publicUri`:** `http://penpot.localhost`.
- **Flags:** `enable-login-with-password disable-registration disable-email-verification disable-secure-session-cookies enable-access-tokens enable-mcp enable-prepl-server enable-auto-file-snapshot`, telemetry off. Not set: `enable-smtp`, `enable-registration`, `enable-admin-console` (it's a client for an external app nobody runs). **Never** `enable-tiered-file-data-storage`.
- **Env:** `PENPOT_FILE_DATA_BACKEND=db`, set explicitly.
- **Postgres 16** StatefulSet and **Valkey 8.1** Deployment as plain manifests in the base. Valkey has **no persistence**.
- **Storage:** StorageClass `local-path-retain` (provisioner `rancher.io/local-path`, `reclaimPolicy: Retain`). Postgres PVC 10Gi, assets PVC 20Gi (documentation only; local-path doesn't enforce size). Penpot's default asset deletion delay and GC.
- **Resources** (requests + memory limits, no CPU limits; recheck after the first real promotion):

  | workload | req mem | limit mem | req cpu |
  | -------- | ------- | --------- | ------- |
  | backend  | 1.5Gi   | 3Gi       | 250m    |
  | frontend | 256Mi   | 768Mi     | 50m     |
  | exporter | 256Mi   | 1.5Gi     | 100m    |
  | mcp      | 128Mi   | 512Mi     | 50m     |
  | postgres | 256Mi   | 1Gi       | 100m    |
  | valkey   | 32Mi    | 128Mi     | 25m     |

  If the chart still deploys the Admin Console workload with the flag off, disable it in `values.yaml`.
- **Ingress:** standard `Ingress`, `className: traefik`, host `penpot.localhost` → the frontend Service (`penpot`), which proxies the UI, `/api`, `/mcp/stream` (streamable HTTP) and `/mcp/ws` (plugin websocket). Plain HTTP; `*.localhost` is a secure context in browsers.
- **Traefik `HelmChartConfig`:** `web` entrypoint `respondingTimeouts.readTimeout: 0` and a matching idle timeout, so MCP streams and the plugin websocket aren't cut at 60 s.
- **`overlays/local`:** patches **only the Postgres pod** with `securityContext.appArmorProfile.type: Unconfined`. Symptom without it: `gosu` spins and Postgres dies with `could not signal for checkpoint: Permission denied`; cause: this host's containerd AppArmor profile. Other hosts apply the base (or their own overlay) without it.
- **Secrets** (never committed; each created by `kubectl create secret generic … --dry-run=client -o yaml | kubectl apply -f -`): `penpot-secrets` (`apiSecretKey`), `postgres-credentials` (`user`, `password`). Their values live in `~/.config/penpot/env` (interim source, see B3).

**Acceptance (this phase):**
1. All pods Ready.
2. Log in at `http://penpot.localhost` with a `manage.py`-created profile (B3).
3. Claude Code connects at `http://penpot.localhost/mcp/stream` and the session survives 10 idle minutes.
4. Backend `get-file` RPC works with an access token (`Authorization: Token <t>`).
5. The exporter renders one PNG **as the automation profile** (proves a viewer can export; if it can't, the automation profile becomes editor in app teams only, never the library team).
6. Deleting the `penpot` namespace leaves the PVs `Released`, not deleted (then re-apply).
7. `penpot-proto` is removed.

_Decided in:_ [How is Penpot deployed on k3s?][t29] with amendments from [credentials][t29-amend-creds], [backups][t29-amend-backup] and [outside access][t29-amend-outside]

## B3 — Profiles and credentials

**Profiles.**
- **Yours:** `manage.py create-profile -e -n -p` inside the backend pod. Owner of every team. Every agent writes over MCP **through your tab**.
- **Design-system team:** create it; it holds the design system library file (B-side of D1). Libraries are team-scoped, so all page designs that use the library live in teams that can link it.
- **Automation profile** `automation@penpot.localhost`: `manage.py create-profile`; **viewer** in the design-system team and in every app team. Joins by invitation link (no SMTP): as owner, invite the email as viewer → **Copy invitation link** → open it in a private window logged in as automation. Repeat per new team.

**Credentials and their interface.**

| Credential                                        | Minted by / on                    | Expiry     | Consumer                 | Interface                                                                                            |
| ------------------------------------------------- | --------------------------------- | ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| MCP key                                           | you, Integrations → MCP Server    | never      | Claude Code              | env `PENPOT_MCP_KEY`                                                                                 |
| Access token `snapshot-refresh`                   | automation profile                | never      | snapshot refresh CronJob | Secret `snapshot-refresh` key `penpotToken`                                                          |
| Fine-grained PAT `snapshot-refresh (ts-packages)` | you, GitHub                       | **1 year** | snapshot refresh CronJob | Secret `snapshot-refresh` key `githubToken`                                                          |
| Automation password                               | `manage.py create-profile`        | never      | design comparison        | env `PENPOT_AUTOMATION_PASSWORD` (+ `PENPOT_AUTOMATION_EMAIL`)                                       |
| `apiSecretKey`                                    | generated                         | never      | backend                  | Secret `penpot-secrets` key `apiSecretKey`                                                           |
| Postgres password                                 | generated                         | never      | Postgres, backend        | Secret `postgres-credentials` keys `user`, `password`                                                |
| Backup keys                                       | you (restic, B2, healthchecks.io) | never      | backup CronJobs          | Secret `penpot-backup` keys `RESTIC_PASSWORD`, `B2_ACCOUNT_ID`, `B2_ACCOUNT_KEY`, `HC_PING_URL` (B4) |
| Tailscale operator OAuth                          | you, Tailscale                    | —          | Tailscale operator       | Secret `tailscale/operator-oauth` keys `client_id`, `client_secret` (only with outside access)       |

- One Penpot access token **per consumer**, named after it.
- **PAT scope:** repository `ts-packages` only; Contents: write, Pull requests: write; **no Workflows**.
- **Hosted CI holds no Penpot credentials.** GitHub Actions uses only `GITHUB_TOKEN` (GHCR).
- **One agent session drives Penpot at a time.**
- Pods read Secrets as env vars and never talk to a secret store, so a future store (OpenBao + ESO, a separate `personal-infra` effort) can fill the same Secrets without touching manifests or images.
- **Local:** tools read `PENPOT_URL`, `PENPOT_MCP_KEY`, `PENPOT_AUTOMATION_EMAIL`, `PENPOT_AUTOMATION_PASSWORD` from the process env and fail naming the missing variable. Interim source: `~/.config/penpot/env`, `chmod 600`, sourced by `~/.zshrc`. Each repo with Penpot tooling commits a `.env.example` (names only). **No repo `.env`.**
- **Claude Code:** user-scope `~/.claude.json`, never a project `.mcp.json`:

  ```json
  "penpot": { "type": "http", "url": "http://penpot.localhost/mcp/stream?userToken=${PENPOT_MCP_KEY}" }
  ```
- `~/.config/penpot/env` also holds the cluster Secret values (`PENPOT_API_SECRET_KEY`, `PENPOT_POSTGRES_PASSWORD`, and in B4 the restic password and B2 key), so Secrets can be recreated after a namespace delete or restore.

_Decided in:_ [How do agents and CI get Penpot credentials?][t30] with amendments from [backups][t30-amend-backup] and [outside access][t30-amend-outside]

---

## C — ts-packages: `design-*` packages and side images

Four **private** (`"private": true`) workspace packages, ignored by Changesets. Penpot lives only at the edges; the resolver and rule engine take **normalized shapes** (component path, variant properties, parts by role, exceptions record), never raw Penpot objects. The link inspector, link reader and drift check share **one pure resolver**, so they can't disagree.

| Package                  | Holds                                                                                                                            | Runtime        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `design-core-js`         | resolver; exceptions-record schema; library-snapshot schema; rule engine; coverage report                                        | browser + node |
| `design-core-node`       | code manifest generator (TS compiler API over `.d.ts`); drift-check CLI over the two JSON files                                  | node           |
| `design-penpot-sdk-node` | Penpot backend RPC client; snapshot normalizer; snapshot refresh (writes the snapshot, opens/updates the PR)                     | node           |
| `design-penpot-ui`       | link inspector plugin (manifest, plugin code, iframe UI); the Penpot-shape → normalized-shape adapter; the `read-links.js` build | browser        |

### The component link (what the resolver implements)

- **Naming convention:** component name = export; variant property / value = prop / value (`default` = prop omitted; booleans `true`/`false`); **compound parts are copies of library components** (e.g. `Card/Header` → `CardHeader`), never plain layers; text layer = children; components under `icon/` named `<Name>` → `<Name>Icon` from `@brrritscold/core-react/icons`.
- **Exceptions record:** `sharedPluginData` namespace `brrritscold.core-react`, key `link`, **only** where naming can't say it: value maps that don't match (e.g. `state` → `disabled`), `slots`, a non-default package. Referenced by role, never by layer name.
- **Slot placeholders:** a compound component holds an `_internal/Slot` placeholder copy (loud magenta, labelled by part) that a designer swaps for a local component. Penpot has no slots and copies can't take children.

### Code manifest

Generated at `core-react` build time from its `.d.ts`: every export, each prop's literal union or boolean, icon names. A **CI artifact only**, never published.

### Library snapshot

`packages/core-react/design/library.snapshot.json`, written by the normalizer from `get-file`, schema-validated, sorted:
- header: Penpot version pin, library file id, schema version (no library version);
- components keyed by **Penpot component id**, each with path, name, variant properties, parts by role, exceptions record;
- per layer: `appliedTokens: {attr → tokenName}` and `unbound: [attr…]` (computed by the refresh, so the check stays offline; layers identified by id + name path, used only in messages);
- the token catalog as DTCG, same shape as `tokens.json`.
- No geometry or other styling.

Read path: RPC **`get-file` without a `features` param** (the backend resolves pointer/object maps itself). Gotcha: JSON `get-file` camel-cases keyword keys, so `shared/brrritscold.core-react` arrives as `brrritscoldCoreReact` (`export-binfile` keeps the exact key). Formats are unversioned: pin Penpot, validate with the schema, fail loudly on change.

### Drift rules (library → code is an error; code → library is a coverage gap)

1. Component name (path stripped) → named export in `.` (or the package the exceptions record names; such components are reported **unchecked**).
2. Variant property → prop; value → literal in that prop's union; `default` → omitted; an exceptions value map overrides.
3. Compound parts must be library component copies, so rule 1 covers them.
4. Components under `icon/` → `<Name>Icon` in `./icons`.
5. Exceptions record valid against its schema; every key points at a real prop, value or role.
6. Token catalog (sets, themes, values) equals `tokens.json` (fixed by re-running token sync).
7. **unbound** — a layer's `unbound` list isn't empty.
8. **unknown token** — an applied token name isn't in `tokens.json`.
9. **primitive colour** — fill or stroke colour applied from a `primitive` token.

Checked attributes (rules 7–9), on every layer of every main component including nested part copies, each only when set to a non-default value: fill, stroke colour, radius r1–r4, padding, row/column gap, font family/size/weight, letter spacing, shadow, opacity ≠ 1. Exempt: x/y, width/height, stroke width, rotation, margin. Whether a layer has the _right_ semantic token is left to review.

Code → library: exports with no library counterpart are a coverage gap; those that should never be in the library (`useDataTable`, `Toaster`, `cn`, …) are on the allowlist `design/drift.config.json`; anything else is a warning.

**Output:** a GitHub step summary table (component → rule → expected vs found) plus job annotations; coverage gaps in a collapsed section; no auto-filed issues. `design-core-js`'s README carries a tripwire: a rule change updates the `design-system` skill.

### Snapshot refresh

- Reads Penpot as the automation profile (`penpotToken`), writes the snapshot, and if it changed opens a PR with the GitHub PAT (a `GITHUB_TOKEN` PR wouldn't trigger CI). Unchanged → no PR. A refresh PR already open → update it.
- In the cluster it calls the backend through the frontend Service, not the ingress.
- Same script runs on demand: by an agent after an MCP edit, or locally during lockstep.
- A refresh PR that fails the drift check never merges and is labelled `drift`.

### Link inspector and link reader

- **Link inspector:** a Penpot plugin that **shows** and **never edits** the link. On a selected library component or an instance on a page design: the `import` line and a JSX snippet (props resolved from variant values, parts as nested part exports), which values came from the exceptions record vs the convention, and an "unresolved" marker wherever the convention can't name something. It doesn't check against `core-react`.
- **Link reader `read-links.js`:** the MCP script (prototyped as `read-screen.js`) that returns every link on a page design in one `execute_code` call, in visual order. Built by `design-penpot-ui`, served at `<inspector-url>/read-links.js`; the skill fetches it at use time.

### Side images

A ts-packages GitHub Actions workflow builds public GHCR images on pushes to `main` touching their sources (plus `workflow_dispatch`), tagged with the **short git SHA**, never `latest`:
- `ghcr.io/brrritscold/design-penpot-static` — nginx-unprivileged serving `/link-inspector/manifest.json` (+ bundle) and `/read-links.js`, with `Access-Control-Allow-Origin: http://penpot.localhost`.
- `ghcr.io/brrritscold/design-snapshot-refresh` — Node, running the snapshot refresh.
- `ghcr.io/brrritscold/penpot-backup` — `postgres:16` client + pinned restic.

Rolling out a new tag is a `personal-infra` PR bumping the kustomize `images:` entry.

**Tests:** as specified in A2 (Node packages) and A3 (`design-penpot-ui`).

_Decided in:_ [Should the component link ship as a reusable open-source Penpot Code Connect?][t14], [How does the drift check between the design library and core-react work?][t19], [How do library components get bound to tokens?][t20], [Can CI read a Penpot library file without a browser tab?][t18], [Does a component link let Claude build correct core-react code from a design?][t9] (amended for [icons][t9-icons] and [parts][t9-parts]); side images from [Penpot on k3s][t29] and [backups][t31]

---

## D1 — `core-react` scaffold, empty library, drift check wired

### Package `@brrritscold/core-react` (`packages/core-react`)

- **ESM only, unbundled:** `tsc -p tsconfig.build.json` emits one `.js` + `.d.ts` per source file so each keeps its own `"use client"`. No tsup, no CJS. `"sideEffects": ["*.css"]`. Framework-agnostic: no `next/*` imports.
- **`build`:** Style Dictionary (`tokens/tokens.json` → `dist/styles.css`) → copy `tokens.json` to `dist/` → `tsc`. Script names stay on the contract.
- **Exports:**

  | Subpath         | Holds                                                                                   |
  | --------------- | --------------------------------------------------------------------------------------- |
  | `.`             | one pure file of named component and part exports plus `cn`; no logic, no `export * as` |
  | `./icons`       | `export * from "lucide-react"`; apps use the `<Name>Icon` aliases                       |
  | `./data-table`  | `useDataTable` only                                                                     |
  | `./styles.css`  | built theme, carrying its own `@source "./**/*.js"` so apps need only the one `@import` |
  | `./tokens.json` | raw token file                                                                          |
  | `./testing`     | component objects; `@playwright/test` optional peer                                     |

  No per-component subpaths. Add `core-react` to the allowlist in `scripts/check-entries.mjs` (it is the only package with a root entry).
- **Source layout:** `components.json` kept (shadcn CLI vendors more later); `src/components/<kebab>.tsx` one per shadcn component with its part exports; `src/lib/utils.ts` (`cn`); `src/icons.ts`; `src/data-table.ts`; `src/index.ts` (re-exports only). Vendored files stay close to upstream so a re-pull diffs cleanly; upstream `"use client"` kept verbatim. Every deviation from `ts-package-layout` is documented in the package README.
- **Dependencies:** peers `react`, `react-dom` ^19, `tailwindcss` ^4, optional `@playwright/test`. Deps: Base UI, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@tanstack/react-table` (imported only by `./data-table`), `react-day-picker`, `date-fns`. **Prefer the source:** when Base UI has a primitive, use it (Toast on Base UI Toast, not Sonner). No react-hook-form dependency (`Field` is library-agnostic). No ThemeProvider (dark mode is the `.dark` class). devDeps `design-core-js`, `design-core-node` as `workspace:*`.
- **Nothing tagged in code:** the code side of the link is export names, exported cva configs (`buttonVariants`) and prop types. cva variant keys/values are literal unions named like the Penpot variant properties.

### Tokens

- `packages/core-react/tokens/tokens.json`, one W3C DTCG file with top-level sets **`primitive`**, **`light`**, **`dark`** (no `$themes`/`$metadata`).
- Two tiers: primitives (`color.slate.500`, `space.4`) and semantics named exactly as shadcn's CSS variables (`background`, `foreground`, `primary`, `primary-foreground`, `muted`, `border`, `ring`, `radius`, …). No component tier.
- Types: color, spacing, sizing, border radius, font family, font size, font weight, line height, letter spacing, shadow, opacity. Breakpoints, motion, z-index stay Tailwind defaults.
- `styles.css`: primitives + light semantics on `:root`, dark semantics on `.dark`, a Tailwind v4 `@theme inline` block mapping semantic variables to utilities. Font sizes stored in px, emitted as rem.
- Components consume tokens only through `@theme inline` utilities. **Forbidden:** arbitrary values (`bg-[#…]`, `p-[13px]`) and default-palette utilities (`bg-slate-500`).

### Tests and checks in `core-react`'s `check`

- Tiers `stories`, `unit`, `integration` as in A3 (`test:stories`, `test:unit`, `test:integration`). This supersedes the two-project `test:unit` from the shape ticket.
- `unit`: every semantic name the components use exists in both `light` and `dark`; a **source scan** rejecting arbitrary values and default-palette utilities.
- Style Dictionary build fails on broken references.
- A token disappearing from `tokens.json` without an entry in `design/token-migrations.json` fails CI.
- **Drift check** job, offline on hosted CI: build the code manifest, run the drift CLI against `design/library.snapshot.json`.

### `design/` in `core-react`

`library.snapshot.json`, `drift.config.json` (allowlist), `token-migrations.json` (append-only `[{ "version", "from", "to" }]`, starts empty).

### Repo plumbing

- `.github/ISSUE_TEMPLATE/promotion.yml` (links the page design, names the layers to promote) and labels `promotion`, `approved`, `drift`.
- Storybook in `core-react` (react-vite). Story `title` = the library component's Penpot path (`Components/Button`); the design parameter holds the Penpot URL. Stories sit next to components and are excluded from the build. `core-react` opts out of the typedoc site and README API generation.
- **Not published yet.** Keep it unpublishable until D3 (e.g. `"private": true`) so pre-release churn never reaches npm.

### Penpot side

1. In the design-system team, create the **design system library** file and publish it as a shared library.
2. **Token sync** `tokens.json` into it (sets `primitive`/`light`/`dark`, theme group `Mode` with Light / Dark). A re-run makes 0 changes.
3. Run the snapshot refresh; commit the first `library.snapshot.json`.

**Acceptance:** `check` green including the drift check against the near-empty snapshot; the snapshot's token catalog equals `tokens.json`.

_Decided in:_ [What shape does @brrritscold/core-react take?][t10] (+ [root-entry follow-up][t10-root], [testing amendment][t10-testing]), [Which frontend stack do core-react and the apps use?][t7], [How do design tokens flow between the token file, the design tool and core-react?][t8], [How do library components get bound to tokens?][t20], [How does a design library change relate to a core-react release, and how do apps pin both?][t28], [How does promotion work end to end?][t11]

## B4 — Side workloads, backup and full acceptance

Needs the C images and the D1 snapshot path.

- **`base/static.yaml`:** Deployment/Service/Ingress for `design-penpot-static` at host **`plugins.penpot.localhost`** (a separate origin, so the plugin iframe can't reach Penpot's cookies or DOM).
- **`base/snapshot-refresh.yaml`:** CronJob in `penpot`, `schedule: "0 3 * * *"`, `timeZone: America/Denver`, `concurrencyPolicy: Forbid`, `backoffLimit: 1`, 3 successful / 3 failed history. Secret `snapshot-refresh` (`githubToken`, `penpotToken`). On demand: `kubectl create job --from=cronjob/snapshot-refresh <name>`.
- **`backup/`:** a CronJob at **02:00** running `pg_dump -Fc` of the `penpot` DB **first**, then `restic backup` of the dump plus the assets PVC (mounted read-only), then `forget --prune --keep-daily 7 --keep-weekly 4 --keep-monthly 6`, then `restic check --read-data-subset=5%`, then a healthchecks.io ping on success. No quiesce (Penpot's GC marks at midnight). Secret `penpot-backup`.
  - `base` repo: one **Backblaze B2 free-tier** bucket; the B2 application key is scoped to that bucket, read/write.
  - `overlays/local` adds a hostPath repo at `/var/backups/penpot` and `restic copy` local → B2.
  - A **weekly restore-check CronJob** restores the latest dump into a throwaway Postgres pod and checks: file count > 0, the design system library file id present, newest `modified_at` < 26 h, and every live `storage_object` exists in the restored assets tree; then tears down.
  - Not backed up: Valkey, PVC block snapshots, secrets. `.penpot` exports are a manual escape hatch, not a backup.
- **`RESTORE.md`:** (1) get the restic password, B2 key and `apiSecretKey` from `~/.config/penpot/env`; (2) scale backend, exporter, MCP to 0; (3) `restic restore` the chosen snapshot (local repo if present, else B2); (4) drop and recreate the DB, `pg_restore`; (5) **replace** the assets dir with the restored tree, never merge; (6) restore with the same `apiSecretKey`, scale up; (7) run the deploy acceptance checks; (8) re-apply the **offboarded list** (remove from team, hard-delete profile). The **restore drill** runs the same steps into namespace `penpot-drill`, reached by port-forward only.
- **`overlays/outside-access` + `OUTSIDE-ACCESS.md`:** written now, **not applied** (see Operating → Outside designer).

**Acceptance (completes B2's list):**
1. The link inspector loads from `http://plugins.penpot.localhost/link-inspector/manifest.json` and installs in Penpot's plugin manager.
2. A manually triggered `snapshot-refresh` job runs (a no-op is fine).
3. A backup run succeeds, pings healthchecks.io and passes `check`; the restore-check job passes.
4. One **full restore drill** into `penpot-drill`: open the library in a browser.

_Decided in:_ [How is Penpot deployed on k3s?][t29], [How is Penpot backed up and restored?][t31], [How does an outside designer get access?][t32]

## D2 — The day-one component set

Accordion, Alert, Alert Dialog, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, Combobox, Dialog, Dropdown Menu, Field, Input, Label, Pagination, Popover, Radio Group, Select, Separator, Sheet, Skeleton, Switch, Table, Tabs, Textarea, Toggle, Toggle Group, Tooltip, Toast, Calendar + Date picker; plus the data-table primitives `DataTableColumnHeader` (`sort: none | asc | desc`, `onSortChange`), `DataTablePagination` (on Pagination: `pageIndex`, `pageCount`, `onPageChange`), `DataTableToolbar`, `DataTableViewOptions` — plain props, **never importing TanStack** — and `useDataTable` in `./data-table` (wraps `useReactTable` with sorting, filtering, pagination, row selection and column visibility; returns the `table` plus prop getters like `getColumnHeaderProps(column)`, `getPaginationProps()`; code-only, no library twin).

Every component lands **code first, in lockstep with its library twin**, in one PR (or a batch):
1. Vendor the shadcn (Base UI) component into `src/components/`; export name = library component name; cva keys = Penpot variant property names as literal unions; compound parts as part exports; barrel export.
2. A story per variant with a `play` function; a component object in `/testing` for the day-one list; the integration spec proving it and its traps.
3. Over MCP **in the library file's own tab**, build the library twin to the convention: component and variant names, variant properties named after props, parts as library component copies, `_internal/Slot` placeholders for slots, icons under `icon/`, an exceptions record only where names can't say it.
4. Apply tokens in the same MCP pass, per the **applied-token rule**:
   > Every styled attribute of a library component carries the token `core-react` uses for it. Read the token off the component's classes: a semantic colour utility → that semantic token, `rounded-*` → `radius`, a scale class → its `primitive` step. Apply it over MCP while building the component (day-one build, promotion, lockstep fix): read `shape.tokens` first, because applying toggles. Colours are always semantic. A raw value or a primitive colour on a library component is drift. A raw value in a page design is never copied into code: use the token whose value matches exactly in the active theme, or stop and flag it. A copy whose applied token was overridden is flagged too, and offered as a promotion. Token sync covers the library and every page design file, until Penpot's "tokens source" setting (2.19) replaces the per-file sync.

   Width/height gets a token when code uses a scale class (`h-9` → `space.9`), best effort, not enforced. Groups can't take tokens; typography applies to whole text layers; one shadow and only the first stroke per layer.
5. Snapshot refresh into the same PR; the drift check goes green.
6. Review: library export (Penpot) vs Storybook render per variant, light and dark. The agent fixes visual mismatches before asking for review.

**Acceptance:** every day-one component has a library twin; drift check green with no unexpected coverage gaps; the "Combobox / Popover in Dialog" stories settle trap 1's open question and the component objects encode the answer; Dark switches the library components in Penpot.

_Decided in:_ [What shape does @brrritscold/core-react take?][t10], [How do library components get bound to tokens?][t20], [What changes does ts-frontend-testing need for core-react and Penpot?][t16], [How does the drift check between the design library and core-react work?][t19]

## D3 — First release

- Make `core-react` publishable; add a **`1.0.0`** changeset; merge the Version Packages PR.
- From now on every `core-react` PR touching `src/`, `tokens.json` or `styles.css` **requires a changeset** (CI fails without one). Library-only changes with no published file (annotation, a snapshot-only refresh) get none.
- **Bumps:** minor = new component, icon, variant value, optional prop, semantic token. Major = renamed/removed prop, removed variant value, removed component/icon, renamed/removed token, changed default. Patch = token _value_ change, or a visual/behaviour fix with the same API. Every major changeset has a `### Migration` section with exact before → after pairs and a pointer to the matching token migrations; review rejects one without it.
- **No library version.** The snapshot at tag `@brrritscold/core-react@x.y.z` is the library state that release matches. No named Penpot versions.
- Storybook deploys to GitHub Pages at `/ts-packages/core-react/`, next to typedoc; the README links it.
- One-time check with a throwaway Next app: with `@brrritscold/core-react` and `/icons` in `optimizePackageImports`, a dev compile doesn't load all of lucide.

_Decided in:_ [How does a design library change relate to a core-react release, and how do apps pin both?][t28], [What shape does @brrritscold/core-react take?][t10]

---

## Operating

These are standing procedures. The skills (A4) carry them for agents; the `personal-infra` runbooks carry the cluster ones.

### Promotion

1. **Propose:** anyone opens a `promotion` issue from the template, linking the page design and naming the layers; a Penpot comment on the page design links back. The issue is the record.
2. **Decide:** only the library owner approves, with the `approved` label. Agents never approve.
3. **Scope:** additions only — a new component (with parts), a new icon, a new variant property or value. Changing what exists is a normal `core-react` PR under lockstep. A new token is a prerequisite step. Every library component is a `core-react` export; a composition used by one app stays local in its page design.
4. **API proposal** comment before any code: export name, props with unions and defaults, parts and slot placeholders, icons, and every raw value mapped to an exact existing token (flagged) or proposed as a new token. The owner OKs it.
5. **One code-first `core-react` PR** referencing (not closing) the issue: new tokens first + token sync → component, stories, tests → library component built over MCP in the library file's tab (applied-token rule) → snapshot refresh → drift green.
6. **Review:** one human review; the PR body has a **three-way screenshot** per variant: page draft, library component (Penpot export), Storybook.
7. **Closed unmerged:** delete the library component over MCP, refresh (nothing to commit), close the issue as not planned with the reason.
8. **After merge, re-point:** open the page file over MCP; `shape.swapComponent(libraryComponent)` on each local copy (a local main or plain layers are replaced by a library copy in the same position and size; a promoted variant uses `switchVariant`); delete the local main; re-point other page designs that used the draft and list them on the issue; post before/after screenshots; close the issue. It closes at re-point, not at release.

### Drift

- **A code PR breaks the library:** lockstep — the PR stays red until an agent fixes the library over MCP and commits a refreshed snapshot into the same PR.
- **A library edit breaks the code:** the refresh PR goes red and is labelled `drift`; revert the library edit over MCP and refresh into the same PR. If the change is wanted, it becomes a normal `core-react` PR first and the library follows under lockstep.
- An applied-token edit in Penpot is drift too.

### Token sync

- Writes **`main`'s `tokens.json`** into the design system library **and every page design file** (idempotent, one run per file), until Penpot 2.19's "tokens source" replaces per-file sync. Page design files accept library updates whenever Penpot offers them, independent of any app's bump.
- For each `design/token-migrations.json` entry whose `from` is still in the file: add `to`; `applyToken` it to every shape whose `shape.tokens` names `from`, on the same attributes; remove `from` **only when no shape in that file still applies it** (otherwise report those shapes and leave it); if `to` is `null`, flag each affected shape for a human.
- Timing: the library is synced inside the `core-react` PR (lockstep); page design files only after merge.
- Penpot changes to tokens come back only as a reviewed PR to `tokens.json` (agent exports over MCP, human reviews); the next sync overwrites anything that never became a merged PR.

### Rotate credentials

Each: trigger → mint → destination → verify. Everything except the PAT rotates only on suspicion of a leak or when someone loses access.
- **GitHub PAT:** on GitHub's expiry email → Regenerate token (same permissions) → re-apply Secret `snapshot-refresh` → `kubectl create job --from=cronjob/snapshot-refresh rotate-check` succeeds.
- **`snapshot-refresh` Penpot token:** new token on the automation profile → re-apply the Secret → manual job succeeds → delete the old token.
- **MCP key:** regenerate (revokes the old) → update `PENPOT_MCP_KEY` → restart Claude Code → reload the Penpot tab.
- **Automation password:** `manage.py update-profile -e automation@penpot.localhost -p …` → update the local env.
- **`apiSecretKey`:** rotate → restart backend → re-mint the MCP key and the `snapshot-refresh` token (it signs sessions, access tokens, MCP keys and invites; verify at build). Update `~/.config/penpot/env`.
- **Postgres password:** `ALTER ROLE` → update `postgres-credentials` → restart backend.
- **Backup keys** (`RESTIC_PASSWORD` via `restic key add`/`remove`, B2 key, `HC_PING_URL`): re-apply `penpot-backup`, run a manual backup, update `~/.config/penpot/env`.
- **Tailscale operator OAuth** (only with outside access): new OAuth client → re-apply `tailscale/operator-oauth` → restart the operator.

### Pin bump to Penpot 2.19 (a reviewed `personal-infra` PR)

1. Diff chart values and default flags against the new chart; carry over every decision above.
2. Take a `pre-upgrade`-tagged restic backup (kept until the next bump is accepted), record the rollback (previous chart version + restore), and run a full restore drill into `penpot-drill`.
3. Re-run `get-file`; the library-snapshot schema must still validate (bump the pin and schema together in one ts-packages PR).
4. Link `sharedPluginData` reads back unchanged.
5. Claude connects at `/mcp/stream` and survives 10 idle minutes (MCP SDK v2, SSE removed).
6. The drift check's RPC calls pass the closed RPC schemas.
7. Render one exporter PNG.
8. The link inspector loads under the tightened plugin API.
9. Retire per-file token sync for library tokens with file sync (penpot#9334); the migration pass then runs on the library only.

Also on 2.19: `annotation` becomes available in the plugin API for a one-line human hint on library components.

### Outside designer (dormant until one exists)

`personal-infra/penpot/overlays/outside-access` + `OUTSIDE-ACCESS.md`:
- **Network:** the Tailscale Kubernetes operator (Secret `tailscale/operator-oauth`) serves Ingresses `penpot.<tailnet>.ts.net` (UI, `/api`, `/mcp/stream`, `/mcp/ws`) and `penpot-plugins.<tailnet>.ts.net` (inspector, `read-links.js`) with automatic TLS; proxies tagged `tag:penpot`. Tailnet HTTPS + MagicDNS enabled first. Policy in `personal-infra/tailscale/policy.hujson`, applied by hand; the designer is a **tailnet user** with an ACL grant to `tag:penpot:443` only (not node sharing: tagged machines can't be shared).
- **One canonical host:** `publicUri: https://penpot.<tailnet>.ts.net` for **everyone**; drop `disable-secure-session-cookies`; inspector CORS follows the new origin; `penpot.localhost` is retired while the overlay is on. **Host-move checklist:** update `PENPOT_URL` and your Claude MCP URL; reinstall the link inspector from the new URL; in-cluster jobs keep internal URLs. Removing the overlay reverses it.
- **Onboarding:** apply the overlay + host move → invite to the tailnet → `manage.py create-profile` with a temporary password shared out of band → team **Copy invitation link** as **editor** in the one design-system team → they install the inspector from the tailnet URL and add Penpot MCP with their own `?userToken=` → they get a scrubbed copy of the `design-system` skill and the rule "library changes only through promotion". Own profile and MCP key; no access token; never the automation profile. Library updates accepted by hand in their page files before building from a design.
- **Offboarding:** remove from the team → `manage.py delete-profile` (hard) → remove from the tailnet (or drop the overlay) → add to the offboarded list in `RESTORE.md`. Don't rely on `mark-profile-as-blocked!`.
- "Penpot credentials never expire" holds while Penpot is tailnet-only.

---

## Out of scope

See the map's [Out of scope][map] section. In short: migrating Figma work; the compainy plugin; Plane; a general open-source Penpot Code Connect, Storybook → Penpot generation and upstream contribution; a cloud target; HA, monitoring, SSO, GitOps, automated upgrades; org administration beyond one outside designer; the secret store behind the credential interface.

## Decision index

| Ticket                                                                                            | Phases                |
| ------------------------------------------------------------------------------------------------- | --------------------- |
| [Which self-hostable design tool replaces Figma?][t5]                                             | all                   |
| [What stands in for Code Connect on the chosen tool?][t6] (superseded in part by #9)              | C                     |
| [Which frontend stack do core-react and the apps use?][t7]                                        | A1, D1                |
| [How do design tokens flow between the token file, the design tool and core-react?][t8]           | D1, Operating         |
| [Does a component link let Claude build correct core-react code from a design?][t9]               | C, D2                 |
| [Can CI read a Penpot library file without a browser tab?][t18]                                   | C                     |
| [What shape does @brrritscold/core-react take?][t10]                                              | D1, D2, D3            |
| [How does the drift check between the design library and core-react work?][t19]                   | C, D1, Operating      |
| [How does promotion work end to end?][t11]                                                        | D1, Operating         |
| [Should the component link ship as a reusable open-source Penpot Code Connect?][t14]              | C, A4                 |
| [How do ts-packages and the testing skills move from mocha + chai to Vitest?][t15]                | A1, A2                |
| [What changes does ts-frontend-testing need for core-react and Penpot?][t16]                      | A2, A3, D1, D2        |
| [What do the new personal-ai frontend-app and design skills cover?][t12]                          | A4                    |
| [How do library components get bound to tokens?][t20]                                             | C, D1, D2, Operating  |
| [How does a design library change relate to a core-react release, and how do apps pin both?][t28] | A4, D1, D3, Operating |
| [How is Penpot deployed on k3s?][t29]                                                             | B1, B2, B4, Operating |
| [How do agents and CI get Penpot credentials?][t30]                                               | B3, Operating         |
| [How is Penpot backed up and restored?][t31]                                                      | B4, Operating         |
| [How does an outside designer get access?][t32]                                                   | B4, Operating         |

[map]: https://github.com/bRRRITSCOLD/ts-packages/issues/4
[t5]: https://github.com/bRRRITSCOLD/ts-packages/issues/5#issuecomment-6617946569
[t6]: https://github.com/bRRRITSCOLD/ts-packages/issues/6#issuecomment-6620348156
[t7]: https://github.com/bRRRITSCOLD/ts-packages/issues/7#issuecomment-6620720639
[t8]: https://github.com/bRRRITSCOLD/ts-packages/issues/8#issuecomment-6621372358
[t9]: https://github.com/bRRRITSCOLD/ts-packages/issues/9#issuecomment-6622289351
[t9-icons]: https://github.com/bRRRITSCOLD/ts-packages/issues/9#issuecomment-6622894945
[t9-parts]: https://github.com/bRRRITSCOLD/ts-packages/issues/9#issuecomment-6634472415
[t18]: https://github.com/bRRRITSCOLD/ts-packages/issues/18#issuecomment-6622558084
[t10]: https://github.com/bRRRITSCOLD/ts-packages/issues/10#issuecomment-6622893205
[t10-root]: https://github.com/bRRRITSCOLD/ts-packages/issues/10#issuecomment-6633903053
[t10-testing]: https://github.com/bRRRITSCOLD/ts-packages/issues/10#issuecomment-6642670466
[t19]: https://github.com/bRRRITSCOLD/ts-packages/issues/19#issuecomment-6634455730
[t11]: https://github.com/bRRRITSCOLD/ts-packages/issues/11#issuecomment-6634657500
[t14]: https://github.com/bRRRITSCOLD/ts-packages/issues/14#issuecomment-6638779471
[t15]: https://github.com/bRRRITSCOLD/ts-packages/issues/15#issuecomment-6640658835
[t16]: https://github.com/bRRRITSCOLD/ts-packages/issues/16#issuecomment-6642660694
[t12]: https://github.com/bRRRITSCOLD/ts-packages/issues/12#issuecomment-6642926727
[t20]: https://github.com/bRRRITSCOLD/ts-packages/issues/20#issuecomment-6643159974
[t28]: https://github.com/bRRRITSCOLD/ts-packages/issues/28#issuecomment-6643308015
[t29]: https://github.com/bRRRITSCOLD/ts-packages/issues/29#issuecomment-6646147481
[t29-amend-creds]: https://github.com/bRRRITSCOLD/ts-packages/issues/29#issuecomment-6647388027
[t29-amend-backup]: https://github.com/bRRRITSCOLD/ts-packages/issues/29#issuecomment-6647485064
[t29-amend-outside]: https://github.com/bRRRITSCOLD/ts-packages/issues/29#issuecomment-6647699494
[t30]: https://github.com/bRRRITSCOLD/ts-packages/issues/30#issuecomment-6647385187
[t30-amend-backup]: https://github.com/bRRRITSCOLD/ts-packages/issues/30#issuecomment-6647485337
[t30-amend-outside]: https://github.com/bRRRITSCOLD/ts-packages/issues/30#issuecomment-6647699741
[t30-amend-skill]: https://github.com/bRRRITSCOLD/ts-packages/issues/12#issuecomment-6647388757
[t31]: https://github.com/bRRRITSCOLD/ts-packages/issues/31#issuecomment-6647484580
[t32]: https://github.com/bRRRITSCOLD/ts-packages/issues/32#issuecomment-6647699256
