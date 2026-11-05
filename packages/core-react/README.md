# @brrritscold/core-react

The component library: shadcn (Base UI) React components on Tailwind v4, themed from one design token file, and the code side of every component link to the design system library in Penpot. **Code wins**: the library mirrors this package.

**Private, not published yet.** `"private": true` until the day-one component set is done; the first publish is `1.0.0`, so no changeset until then. Spec: [`docs/design-system/SPEC.md` § D](https://github.com/bRRRITSCOLD/ts-packages/blob/main/docs/design-system/SPEC.md); terms: [`GLOSSARY.md`](https://github.com/bRRRITSCOLD/ts-packages/blob/main/docs/design-system/GLOSSARY.md). Its docs are Storybook: `pnpm storybook`.

## Using it

```css
/* app/globals.css: Tailwind, the theme and a @source for this package's files, in one import */
@import "@brrritscold/core-react/styles.css";
```

```tsx
import { Button } from '@brrritscold/core-react'
import { PlusIcon } from '@brrritscold/core-react/icons'

;<Button variant="outline" size="sm">
	<PlusIcon /> Add
</Button>
```

Dark mode is the `.dark` class on an ancestor; there is no theme provider.

| Subpath         | Holds                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `.`             | named component and part exports plus `cn`, from one pure barrel (`src/index.ts`)                |
| `./icons`       | `export * from "lucide-react"`; use the `<Name>Icon` aliases                                     |
| `./data-table`  | `useDataTable` only (arrives with the day-one data table; empty until then)                      |
| `./styles.css`  | the built theme: `@import "tailwindcss"`, its own `@source "./**/*.js"`, tokens, `@theme inline` |
| `./tokens.json` | the raw token file                                                                               |

## Where this package departs from the repo's package layout

Everything not listed here follows the shared layout (script names, strict pnpm dependencies, `.js` on relative imports).

| The other packages                                       | core-react                                                                                                                                                                  | Why                                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| tsup, dual ESM/CJS                                       | **ESM only, unbundled**: `tsc -p tsconfig.build.json` emits one `.js` + `.d.ts` per source file; no `require` condition                                                     | each file keeps its own `"use client"`                                                                                        |
| `build` is `tsup`                                        | `build` is Style Dictionary (`tokens/tokens.json` → `dist/styles.css`, `scripts/build-styles.ts`) → copy `tokens.json` to `dist/` → `tsc`                                   | the CSS and JSON exports are build output too                                                                                 |
| no `.` entry, no `index.ts`                              | `src/index.ts` is the `.` entry: named re-exports only, no logic, no `export *`. `scripts/check-entries.mjs` allowlists it and checks that                                  | ESM and unbundled, so bundlers tree-shake it per component and Next's `optimizePackageImports` rewrites named imports from it |
| every export is JavaScript                               | `./styles.css` and `./tokens.json` are plain files; `"sideEffects": ["*.css"]`                                                                                              | apps import the theme once and read raw tokens                                                                                |
| typedoc site and generated README `## API`               | **Storybook is the docs**; the root `typedoc.json` excludes this package and this README has no API section                                                                 | a component's docs are its rendered variants                                                                                  |
| tiers `unit`, `integration`, `e2e` on `vitest.shared.ts` | own `vitest.config.ts`: `stories` (beside components in `src/`, excluded from the build) and `unit` on jsdom taking `.tsx`; `integration` is Playwright (to come); no `e2e` | the story is the test; browser flows need real Playwright `Locator`s                                                          |
| siblings as `workspace:^`                                | devDeps `@brrritscold/design-core-js` and `design-core-node` as `workspace:*`                                                                                               | they are private, for the drift check, never published                                                                        |
| starts at `0.1.0`, releases with its first changeset     | `"private": true`, version `0.0.0` until the day-one set is done; first publish `1.0.0`                                                                                     | pre-release churn never reaches npm                                                                                           |
| `tsconfig.json` with `lib: ["esnext"]`                   | adds `dom` and `jsx: "react-jsx"`; typechecks `src`, `tests`, `scripts`, `.storybook`                                                                                       | React components and their stories                                                                                            |
| one `turbo.json` at the root                             | `turbo.json` here extends it so `build` also hashes `tokens/` and `scripts/`                                                                                                | the token build is part of `build`                                                                                            |

Scripts beyond the contract: `build:styles` (the token half of `build`), `test:stories` / `test:stories:watch`, `storybook`, `storybook:build`. Each Storybook and stories script runs `build:styles` first, since the preview imports `dist/styles.css`.

## Tokens

`tokens/tokens.json` is the **token file**, one W3C DTCG tree with the top-level sets `primitive`, `light` and `dark` (no `$themes` or `$metadata`).

- **Primitives** hold raw values: `color.neutral.500`, `space.4`, `border-radius.lg`, `font-size.sm`, … A half step is written with a dash, since a token name can't hold a dot: `px-2.5` is `space.2-5`.
- **Semantics** are named exactly as shadcn's CSS variables (`background`, `primary-foreground`, `border`, `ring`, `radius`, …), point at primitives, and are defined in both `light` and `dark`. Colours are only ever semantic in components.
- **`$type`s** follow Penpot's token types, so token sync writes them as they are: `color`, `spacing`, `sizing`, `borderRadius`, `fontFamilies`, `fontSizes`, `fontWeights`, `number` (line height), `letterSpacing`, `shadow`, `opacity`.
- **`styles.css`**: primitives and light semantics on `:root`, dark semantics on `.dark`, an `@theme inline` block mapping each colour semantic to a utility (`bg-primary`) and `radius` to the `rounded-*` scale. Font sizes are stored in px and emitted as rem. Style Dictionary fails the build on a broken reference.
- Components use tokens only through those utilities. **Arbitrary values (`bg-[#…]`, `p-[13px]`) and default-palette utilities (`bg-slate-500`, `text-white`) are rejected** by the unit tier's source scan.

## Vendoring a shadcn component

Components come from shadcn's `base-vega` registry (Base UI), one file per component in `src/components/<kebab>.tsx` with its part exports and stories beside it. `components.json` is kept so the shadcn CLI can vendor more. Keep a file close to upstream so a re-pull diffs cleanly: pull, run `pnpm lint` (Biome reformats quotes and indentation), then diff. Upstream `"use client"` stays verbatim.

Where upstream steps off the tokens, the file says so in a header comment and fixes it. In `button.tsx`: secondary's `hover:bg-[color-mix(…)]` is `hover:bg-secondary/80`, and the small sizes' `rounded-[min(var(--radius-md),…)]` corners are dropped for the base `rounded-md` (the same 8px at today's `radius`).

Naming is the component link: export name = library component name, cva variant keys = the Penpot variant properties with literal-union values (`variant`, `size`), and the cva config is exported (`buttonVariants`).

## Tests

| Tier      | Files                             | Runner                                                                                                    |
| --------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `stories` | `src/components/*.stories.tsx`    | Vitest browser mode (Chromium) via `@storybook/addon-vitest`; `@storybook/addon-a11y` fails on violations |
| `unit`    | `tests/unit/**/*.unit.test.ts(x)` | Vitest on jsdom: `cn`, the token build, the token checks and the source scan                              |

A story's `title` is its library component's Penpot path (`Components/Button`), one story per variant value, each with a `play` function. A story that opts out of a11y (`parameters: { a11y: { test: 'off' } }`) says why in a comment beside it. The token checks: light and dark define the same semantic tokens, and every class a component applies compiles to a utility of the built theme.

`pnpm test:stories` needs Chromium once: `pnpm exec playwright install chromium`.
