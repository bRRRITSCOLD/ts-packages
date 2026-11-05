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
| `./testing`     | component objects for Playwright specs (`dialog(root)`); `@playwright/test` is an optional peer  |

## Where this package departs from the repo's package layout

Everything not listed here follows the shared layout (script names, strict pnpm dependencies, `.js` on relative imports).

| The other packages                                       | core-react                                                                                                                                                                                         | Why                                                                                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| tsup, dual ESM/CJS                                       | **ESM only, unbundled**: `tsc -p tsconfig.build.json` emits one `.js` + `.d.ts` per source file; no `require` condition                                                                            | each file keeps its own `"use client"`                                                                                        |
| `build` is `tsup`                                        | `build` is Style Dictionary (`tokens/tokens.json` → `dist/styles.css`, `scripts/build-styles.ts`) → copy `tokens.json` to `dist/` → `tsc`                                                          | the CSS and JSON exports are build output too                                                                                 |
| no `.` entry, no `index.ts`                              | `src/index.ts` is the `.` entry: named re-exports only, no logic, no `export *`. `scripts/check-entries.mjs` allowlists it and checks that                                                         | ESM and unbundled, so bundlers tree-shake it per component and Next's `optimizePackageImports` rewrites named imports from it |
| every export is JavaScript                               | `./styles.css` and `./tokens.json` are plain files; `"sideEffects": ["*.css"]`                                                                                                                     | apps import the theme once and read raw tokens                                                                                |
| typedoc site and generated README `## API`               | **Storybook is the docs**; the root `typedoc.json` excludes this package and this README has no API section                                                                                        | a component's docs are its rendered variants                                                                                  |
| tiers `unit`, `integration`, `e2e` on `vitest.shared.ts` | own `vitest.config.ts`: `stories` (beside components in `src/`, excluded from the build) and `unit` on jsdom taking `.tsx`; `integration` is Playwright against a static Storybook build; no `e2e` | the story is the test; browser flows need real Playwright `Locator`s                                                          |
| siblings as `workspace:^`                                | devDeps `@brrritscold/design-core-js` and `design-core-node` as `workspace:*`                                                                                                                      | they are private, for the drift check, never published                                                                        |
| starts at `0.1.0`, releases with its first changeset     | `"private": true`, version `0.0.0` until the day-one set is done; first publish `1.0.0`                                                                                                            | pre-release churn never reaches npm                                                                                           |
| `tsconfig.json` with `lib: ["esnext"]`                   | adds `dom` and `jsx: "react-jsx"`; typechecks `src`, `tests`, `scripts`, `.storybook`                                                                                                              | React components and their stories                                                                                            |
| one `turbo.json` at the root                             | `turbo.json` here extends it so `build` also hashes `tokens/` and `scripts/`                                                                                                                       | the token build is part of `build`                                                                                            |

Scripts beyond the contract: `build:styles` (the token half of `build`), `test:stories` / `test:stories:watch`, `storybook`, `storybook:build`. Each Storybook and stories script runs `build:styles` first, since the preview imports `dist/styles.css`. `test:integration` builds Storybook itself and has no containers, so there is no `test:integration:setup` / `:teardown`; `test:integration:ci` is `test:integration`.

## Tokens

`tokens/tokens.json` is the **token file**, one W3C DTCG tree with the top-level sets `primitive`, `light` and `dark` (no `$themes` or `$metadata`).

- **Primitives** hold raw values: `color.neutral.500`, `space.4`, `border-radius.lg`, `font-size.sm`, … A half step is written with a dash, since a token name can't hold a dot: `px-2.5` is `space.2-5`.
- **Semantics** are named exactly as shadcn's CSS variables (`background`, `primary-foreground`, `border`, `ring`, `radius`, …), point at primitives, and are defined in both `light` and `dark`. Colours are only ever semantic in components.
- **`$type`s** follow Penpot's token types, so token sync writes them as they are: `color`, `spacing`, `sizing`, `borderRadius`, `fontFamilies`, `fontSizes`, `fontWeights`, `number` (line height), `letterSpacing`, `shadow`, `opacity`.
- **`styles.css`**: primitives and light semantics on `:root`, dark semantics on `.dark`, an `@theme inline` block mapping each colour semantic to a utility (`bg-primary`) and `radius` to the `rounded-*` scale. Font sizes are stored in px and emitted as rem. Style Dictionary fails the build on a broken reference.
- Components use tokens only through those utilities. **Arbitrary values (`bg-[#…]`, `p-[13px]`) and default-palette utilities (`bg-slate-500`, `text-white`) are rejected** by the unit tier's source scan.

## Vendoring a shadcn component

Components come from shadcn's `base-vega` registry (Base UI), one file per component in `src/components/<kebab>.tsx` with its part exports and stories beside it. `components.json` is kept so the shadcn CLI can vendor more. Keep a file close to upstream so a re-pull diffs cleanly: pull, run `pnpm lint` (Biome reformats quotes and indentation), then diff. Upstream `"use client"` stays verbatim.

Where upstream steps off the tokens, the file says so in a header comment and fixes it:

- `button.tsx`: secondary's `hover:bg-[color-mix(…)]` is `hover:bg-secondary/80`, and the small sizes' `rounded-[min(var(--radius-md),…)]` corners are dropped for the base `rounded-md` (the same 8px at today's `radius`).
- `dialog.tsx`, `alert-dialog.tsx`: the overlay's `bg-black/10` is `bg-foreground/10 dark:bg-background/10`, near-black at 10% in both modes. Dialog's popup centres with `inset-x-4 mx-auto` instead of `left-1/2 w-full max-w-[calc(100%-2rem)] -translate-x-1/2` (the same 1rem gutter). Alert Dialog's header drops its three `grid-rows-[…]` templates; implicit rows lay out the same.

Upstream's open and close animations (`animate-in`, `fade-in-0`, `zoom-in-95`, …) come from `tw-animate-css`, which `styles.css` imports after Tailwind.

Naming is the component link: export name = library component name, cva variant keys = the Penpot variant properties with literal-union values (`variant`, `size`), and the cva config is exported (`buttonVariants`).

## Tests

| Tier          | Files                                        | Runner                                                                                                             |
| ------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `stories`     | `src/components/*.stories.tsx`               | Vitest browser mode (Chromium) via `@storybook/addon-vitest`; `@storybook/addon-a11y` fails on violations          |
| `unit`        | `tests/unit/**/*.unit.test.ts(x)`            | Vitest on jsdom: `cn`, the token build, the token checks, the source scan and the tier-placement check             |
| `integration` | `tests/integration/**/*.integration.spec.ts` | Playwright against `storybook build`, served by `vite preview`; proves the component objects and the Base UI traps |

A story's `title` is its library component's Penpot path (`Components/Button`), one story per variant value, each with a `play` function. A story that opts out of a11y (`parameters: { a11y: { test: 'off' } }`) says why in a comment beside it. The token checks: light and dark define the same semantic tokens, and every class a component applies compiles to a utility of the built theme.

An integration spec opens a story by id (`openStory(page, 'components-dialog--nested')`, from `tests/integration/__utils__/story.ts`), which waits until Storybook has run the story's `play` function: the spec starts from the state `play` leaves. `retries` is 0. The tier-placement check fails a file whose suffix doesn't match its tier directory, and any skipped test or suite (`test.fixme` is allowed).

`pnpm test:stories` and `pnpm test:integration` need Chromium once: `pnpm exec playwright install chromium`.

## Component objects (`./testing`)

A component object drives one component the way a person would, so an app's specs never meet a Base UI trap. Each is a plain factory over a root `Locator`, with no Playwright fixtures; an app registers the ones it uses through its own `test.extend`:

```ts
// an app — tests/integration/__utils__/test.ts
import { test as base } from '@playwright/test'
import { dialog } from '@brrritscold/core-react/testing'

export const test = base.extend<{ profileDialog: ReturnType<typeof dialog> }>({
	profileDialog: async ({ page }, use) =>
		use(dialog(page.getByRole('dialog', { name: 'Edit profile' }))),
})
```

`dialog(root)` drives a Dialog or an Alert Dialog: `root` is the popup (role `dialog` or `alertdialog`), `button(name)` and `field(label)` look inside it, and `dismiss()` presses Escape. Its methods wait; specs assert. The Base UI traps it carries, each proven in `tests/integration/dialog.integration.spec.ts`:

1. **Escape closes only the top layer.** `dismiss()` waits for its dialog to be on top: a dialog under a nested one is `aria-hidden`, so a root found by role is hidden until the layers above close.
2. **The page under a dialog is `aria-hidden`, not `inert`**, so an unscoped `getByLabel` or `getByText` still hits a twin on the page. Every lookup goes through `root`.
3. **An exit animation keeps a closing popup mounted** (`data-ending-style`). `dismiss()` returns once the dialog is hidden; a spec asserts closed with auto-waiting `toBeHidden()`, never an immediate count.
4. **`data-testid` reaches parts, not Root.** `Dialog` renders no DOM, so a testid on it reaches nothing; put it on `DialogContent` or `DialogTrigger`.
