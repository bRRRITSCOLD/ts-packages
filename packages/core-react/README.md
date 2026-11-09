# @brrritscold/core-react

The component library: shadcn (Base UI) React components on Tailwind v4, themed from one design token file, and the code side of every component link to the design system library in Penpot. **Code wins**: the library mirrors this package.

**Private, not published yet.** `"private": true` until the day-one component set is done; the first publish is `1.0.0`, which brings its first changeset. From `1.0.0` on, every PR touching `src/`, `tokens/tokens.json` or `styles.css` needs a changeset and CI fails without one; until then none is added. Spec: [`docs/design-system/SPEC.md` § D](https://github.com/bRRRITSCOLD/ts-packages/blob/main/docs/design-system/SPEC.md); terms: [`GLOSSARY.md`](https://github.com/bRRRITSCOLD/ts-packages/blob/main/docs/design-system/GLOSSARY.md). Its docs are Storybook: `pnpm storybook`.

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

| Subpath         | Holds                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.`             | named component and part exports plus `cn`, from one pure barrel (`src/index.ts`)                                                                                    |
| `./icons`       | `export * from "lucide-react"`; use the `<Name>Icon` aliases                                                                                                         |
| `./data-table`  | `useDataTable` only (arrives with the day-one data table; empty until then)                                                                                          |
| `./styles.css`  | the built theme: `@import "tailwindcss"`, its own `@source "./**/*.js"`, tokens, `@theme inline`                                                                     |
| `./tokens.json` | the raw token file                                                                                                                                                   |
| `./testing`     | component objects for Playwright specs (`dialog(root)`, `toast(page)`, `toggleGroup(root)`, `accordion(root)`, `tabs(root)`); `@playwright/test` is an optional peer |

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

Scripts beyond the contract: `build:styles` (the token half of `build`), `drift:manifest` / `drift:check` (see [Drift check](#drift-check)), `test:stories` / `test:stories:watch`, `storybook`, `storybook:build`. Each Storybook and stories script runs `build:styles` first, since the preview imports `dist/styles.css`. `test:integration` builds Storybook itself and has no containers, so `test:integration:setup` / `:teardown` run empty scripts; they are kept so `test:integration:ci` has the same setup → run → teardown shape as every other package.

## Tokens

`tokens/tokens.json` is the **token file**, one W3C DTCG tree with the top-level sets `primitive`, `light` and `dark` (no `$themes` or `$metadata`).

- **Primitives** hold raw values: `color.neutral.500`, `space.4`, `size.md`, `font-size.sm`, … A half step is written with a dash, since a token name can't hold a dot: `px-2.5` is `space.2-5`. Each class has one token: `h-9` and `size-9` read `space.9`; `size.*` holds only the container widths `max-w-*` reads.
- **Semantics** are named exactly as shadcn's CSS variables (`background`, `primary-foreground`, `border`, `ring`, `radius`, …), point at primitives, and are defined in both `light` and `dark`. Colours are only ever semantic in components.
- **`$type`s** follow Penpot's token types, so token sync writes them as they are: `color`, `spacing`, `sizing`, `borderRadius`, `fontFamilies`, `fontSizes`, `fontWeights`, `number` (line height), `letterSpacing`, `shadow`, `opacity`.
- **`styles.css`**: primitives and light semantics on `:root`, dark semantics on `.dark`, then the `@theme inline` block. It clears Tailwind's default scale for every token type and maps the tokens in their place, so a utility reads its token's variable (`p-4` → `var(--space-4)`) and changing a token changes every class that uses it:

  | Token              | Utilities                                                                                                             |
  | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
  | colour semantics   | `bg-primary`, `text-muted-foreground`, `border-input`, …                                                              |
  | `radius`           | `rounded-sm` … `rounded-xl`, shadcn's derived scale                                                                   |
  | `space.*`          | spacing and sizing: `p-4`, `gap-1.5`, `h-9`, `size-4`, `inset-x-4`                                                    |
  | `size.*`           | `max-w-xs` … `max-w-2xl`                                                                                              |
  | `font-family.*`    | `font-sans`, `font-mono`                                                                                              |
  | `font-size.*`      | `text-xs` … `text-2xl` (font size only; line height comes from `leading-*`, inherited from `body`'s `leading-normal`) |
  | `font-weight.*`    | `font-normal` … `font-bold`                                                                                           |
  | `line-height.*`    | `leading-tight`, `leading-normal`, `leading-relaxed`                                                                  |
  | `letter-spacing.*` | `tracking-tight`, `tracking-normal`, `tracking-wide`                                                                  |
  | `shadow.*`         | `shadow-xs`, `shadow-sm`                                                                                              |
  | `opacity.*`        | `opacity-0`, `opacity-10`, `opacity-50`, `opacity-100`, and a colour's `/10` or `/50` modifier                        |

  A token already named as its theme variable (`--font-weight-medium`, `--shadow-xs`, `--opacity-50`) sits in a second `@theme inline reference` block, so Tailwind doesn't emit it again as a variable pointing at itself. Breakpoints, motion and z-index keep Tailwind's defaults. Font sizes are stored in px and emitted as rem; opacities are stored as fractions and emitted as percentages, the form a colour modifier's `color-mix()` takes. Style Dictionary fails the build on a broken reference.

- Components use tokens only through those utilities. **Arbitrary values (`bg-[#…]`, `p-[13px]`) and default-palette utilities (`bg-slate-500`, `text-white`) are rejected** by the unit tier's source scan, and the token checks fail a component class that sets a spacing, sizing, typography, shadow, opacity, radius or colour property without reading a token.

## Drift check

The CI job `drift` keeps this package and the design system library in Penpot honest, offline and without Penpot credentials:

1. `pnpm drift:manifest` writes `code-manifest.json` (gitignored; CI uploads it as the `code-manifest` artifact) from the built `.d.ts`: every export, each prop's literal union, the icon names. Run `build` first.
2. `pnpm drift:check` checks `design/library.snapshot.json` against the manifest and `tokens/tokens.json` (drift rules 1–9 in `@brrritscold/design-core-js`). Library → code mismatches fail; code → library gaps are a warning, except the exports on the allowlist.
3. Every token the PR's base `tokens.json` has and this one doesn't needs a `design/token-migrations.json` entry, or the job fails (`design-drift migrations`).

| File                           | Holds                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `design/library.snapshot.json` | the normalized library file; written only by the snapshot refresh, never by hand                             |
| `design/drift.config.json`     | `allowlist`: exports that never get a library twin (`cn`, cva configs like `buttonVariants`)                 |
| `design/token-migrations.json` | append-only `[{ "version", "from", "to" }]`; `to: null` when nothing replaces the token. Token sync reads it |

Fixing a red check, lockstep PRs and promotion: the personal-ai `design-system` skill.

### Where a library twin can't match the code

Penpot can't say everything a class list says. The library twin keeps every checked attribute on a token and accepts these known differences:

- **`rounded-md` is `radius`, 2px rounder.** Code derives `rounded-md` as `calc(var(--radius) - 2px)` (8px); Penpot has no derived token, so the applied-token rule puts `radius` (10px) on the corners.
- **A colour at an opacity is a tint layer.** Applying a colour token resets the fill's opacity to 1, so Button `destructive`'s `bg-destructive/10` is an absolute `Tint` rectangle behind the label: fill `destructive`, layer opacity `opacity.10`. Penpot can't change an opacity by theme, so dark's `/20` stays at 10%.
- **`dark:` overrides that pick another semantic are dropped.** Button `outline`'s `dark:border-input dark:bg-input/30` stay `border` and `background`.
- **Hover and focus states have no variants**, and neither do the focus and `aria-invalid` rings (`ring-3 ring-*/20`). A state backed by a prop is a variant property named after it, with values `true` / `false`: Checkbox `checked` / `disabled` / `aria-invalid`, Switch `checked` / `disabled`, Input and Textarea `disabled` / `aria-invalid`. Button has none: it was built before the form controls.
- **A disabled control is the whole twin at `opacity.50`**, as `data-disabled:opacity-50` fades the whole element.
- **RadioGroup's item has no `checked` variant**, because `RadioGroupItem` has no `checked` prop (the group's `value` picks it). `Components/RadioGroup/Item` holds a hidden `Checked` layer, which a copy shows to draw the selected item.
- **Input and Textarea fill with `background`** where code is `bg-transparent`. A Penpot board with no fill casts its shadow from its children, so `shadow.xs` smeared the placeholder text; on a page the fill looks the same.
- **Checkbox's corners are `border-radius.sm`** (6px, the `rounded-sm` it is in code), not `radius`, which would make a 16px box nearly round.
- **Field `responsive` looks like `vertical`.** It goes horizontal in a field group 28rem or wider, a container query Penpot can't express.
- **Toast is the resting toast only.** Stacking, expand-on-hover and swipe have no twin; `Toast` is one toast at the viewport's `max-w-sm` (384px). Its `type` icon is a hidden `Icon` layer (`CircleCheck`) a copy shows and swaps, since `type` is toast data, not a prop. Its corners are `border-radius.xl` (14px, the `rounded-xl` it is in code), and its text lines are 21px tall against code's 20px, so it stands 2px taller.
- **Badge is 2px narrower.** Its `border border-transparent` adds 1px a side in code; the twin draws no transparent stroke. `destructive` is a `Background` tint (`destructive` at `opacity.10`), dark's `/20` included.
- **Toggle and ToggleGroup use exact radius tokens and text labels.** `rounded-md` is `border-radius.md` (8px), as Checkbox does; the items show a `Label` text where stories show an icon. `outline` fills with `background`, as Input does. A joined (`spacing` 0) outline group keeps each item's full border, so its dividers are 2px where code's `border-l-0` makes them 1px.
- **Alert's action is a hidden `Action` layer** at `top-2.5 right-3`. A copy that shows it applies `space.18` to the right padding, as `has-data-[slot=alert-action]:pr-18` does. `destructive`'s description is `destructive` at full strength, not `/90`: no `opacity.90` token.
- **Avatar's border ring is a `Ring` ellipse** on top (`after:` overlay, `mix-blend-darken` dropped). `Image` and `Badge` are hidden layers a copy shows; `AvatarGroup` is layout-only (`-space-x-2`) and on the drift allowlist.
- **Open/active states are hidden layers.** Base UI holds them, not a prop. `Accordion/Item` has a hidden `Content` and its Trigger a hidden `Open` chevron (`ChevronUp`) beside `Closed` (`ChevronDown`). `Tabs/Trigger` has a hidden `Active` pill (`background`, `shadow.sm`) and a hidden `Line` bar for the `line` list. A copy shows them. The bottom border of an accordion item is a 1px `Border` layer, hidden on the last item.
- **An inactive tab's text is `muted-foreground`,** not `text-foreground/60` (there is no `opacity.60` token). Dark's active `border-input bg-input/30` stays `background`. Vertical `Tabs` turns its `List` copy into a column.
- **Card's `ring-1 ring-foreground/10` is a `Ring` layer** on top (`foreground` stroke at `opacity.10`). The `sm` variant overrides its parts' padding to `space.4` and the title to `font-size.sm`. `Action` is hidden in `Header`; `Action`, `Content`, `Footer` and `Tabs/Content`, `Accordion/Content` hold `_internal/Slot` placeholders. `BreadcrumbItem` is layout-only and on the drift allowlist. `BreadcrumbList`'s gap is `space.2-5` (`sm:gap-2.5`, the desktop width).
- **The dark-mode switch thumb is wrong.** Code's thumb is `dark:bg-foreground` unchecked and `dark:bg-primary-foreground` checked. The twin keeps `background`, so in Dark an unchecked thumb is near-black on the track.
- **An icon's stroke stays 2px when resized.** lucide scales the stroke with the icon's size; Penpot scales the paths (constraints `scale`) but not the stroke width. A twin that resizes an icon copy sets the copy's stroke width by hand (Checkbox's 14px check: 2 × 14 / 24 ≈ 1.167).
- **An icon's dot is a filled circle.** lucide draws a dot (`Info`, `CircleExclamationPoint`) as a 0.01px path with round caps, which Penpot doesn't render; the twin uses a 2×2 ellipse with fill `foreground`, the same shape.
- **Library icons use lucide's canonical names, never aliases** (`CircleExclamationPoint`, not `CircleAlert`), so a lucide major that drops an alias doesn't break drift rule 4. Icon twins are built from `lucide-react`'s own icon data over MCP, so their geometry matches the installed version.

## Vendoring a shadcn component

Components come from shadcn's `base-vega` registry (Base UI), one file per component in `src/components/<kebab>.tsx` with its part exports and stories beside it. `components.json` is kept so the shadcn CLI can vendor more. Keep a file close to upstream so a re-pull diffs cleanly: pull, run `pnpm lint` (Biome reformats quotes and indentation), then diff. Upstream `"use client"` stays verbatim.

Where upstream steps off the tokens, the file says so in a header comment and fixes it:

- `button.tsx`: secondary's `hover:bg-[color-mix(…)]` is `hover:bg-secondary/80`, and the small sizes' `rounded-[min(var(--radius-md),…)]` corners are dropped for the base `rounded-md` (the same 8px at today's `radius`).
- `dialog.tsx`, `alert-dialog.tsx`: the overlay's `bg-black/10` is `bg-foreground/10 dark:bg-background/10`, near-black at 10% in both modes. Dialog's popup centres with `inset-x-4 mx-auto` instead of `left-1/2 w-full max-w-[calc(100%-2rem)] -translate-x-1/2` (the same 1rem gutter). Alert Dialog's header drops its three `grid-rows-[…]` templates; implicit rows lay out the same.
- `checkbox.tsx`: the box's `rounded-[4px]` is `rounded-sm` (6px at today's `radius`, 2px rounder).
- `checkbox.tsx`, `radio-group.tsx`: `disabled:` is `data-disabled:`. The box and the item are `<span>`s Base UI marks `data-disabled`, so `:disabled` never matched and a disabled control didn't fade.
- `separator.tsx`: `data-horizontal:` / `data-vertical:` are `data-[orientation=horizontal]:` / `data-[orientation=vertical]:`, the attribute Base UI 1.9 sets; upstream's never matched, so the line was 0px tall (and Field's separator a 10px bar).
- `input.tsx`, `textarea.tsx`: `transition-[color,box-shadow]` is `transition-all`.
- `switch.tsx`: the track's `h-[18.4px] w-[32px]` and `h-[14px] w-[24px]` are `h-4.5 w-8` and `h-3.5 w-6` (the default track 0.4px shorter; `space.4-5` was added for it), and the thumb's `translate-x-[calc(100%-2px)]` is the step it works out to, `translate-x-3.5` / `translate-x-2.5`.
- `sheet.tsx`: the overlay's `bg-black/10` is `bg-foreground/10 dark:bg-background/10`, as in Dialog; the slide offsets `translate-x-[2.5rem]` (each side) are `translate-x-10`.
- `tooltip.tsx`: the arrow's `translate-y-[calc(-50%-2px)]` is `-translate-y-1/2`, its 2px moved into the top/bottom offsets (`top-0.5`, `-bottom-2`); its `rounded-[2px]` is `rounded-xs` (`border-radius.xs`, added for it). The `data-[state=delayed-open]:` animations are dropped: Base UI 1.9 sets no `data-state`.
- `dropdown-menu.tsx`: the submenu's `min-w-[96px]` is `min-w-24`.
- Popover, Dropdown Menu, Sheet and Tooltip read primitives added for them: `space.32`, `space.72`, `shadow.md`, `shadow.lg`, `letter-spacing.widest`, `border-radius.xs`. `shadow.md` and `shadow.lg` are Tailwind's with each layer's negative spread set to 0: Penpot rejects a negative spread. Base UI's runtime positioning variables (`origin-(--transform-origin)`, `w-(--anchor-width)`, `max-h-(--available-height)`) are layout, not design, and the source scan allows them.
- `select.tsx`, `combobox.tsx`, `input-group.tsx`: `transition-[color,box-shadow]` is `transition-all`. Select's `min-w-36` reads `space.36`, added for it.
- `combobox.tsx`: the popup's `min-w-[calc(var(--anchor-width)+--spacing(7))]` and the list's `max-h-[min(…)]` read the theme variables (`var(--spacing-7)`), since the theme clears `--spacing`; the source scan allows arithmetic on Base UI's runtime variables and spacing variables only. The list drops `no-scrollbar`, a utility upstream defines in its own CSS. The chip's `h-[calc(--spacing(5.5))]` is `h-5.5` (`space.5-5`, added for it). The icon-only trigger, clear and chip-remove buttons are named `Show options`, `Clear` and `Remove` (upstream's fail a11y's button-name rule), and the trigger is out of the tab order: an open popup marks everything but the input `aria-hidden`, and a tabbable button in there fails aria-hidden-focus. The input is the keyboard stop; ArrowDown opens the list. `ComboboxList` has no name of its own: give it an `aria-label`.
- `input-group.tsx` is vendored as Combobox's input and **not exported**: Input Group isn't in the day-one set, so it has no library twin; exporting it is a promotion. `rounded-[calc(var(--radius)-5px)]` is `rounded-sm` (1px rounder) and the addon's kbd nudges `-0.15rem` are `-0.5`.
- `toast.tsx` (Base UI Toast, not Sonner): upstream's stacking and swipe geometry is kept, without its element-local variables (`[--gap:0.75rem]`, `[--peek:…]`, `[--offset-y:…]`, `[--scale:…]`, `[--shrink:…]`, `[--height:…]`). Each `transform` reads Base UI's toast variables (`--toast-index`, `--toast-offset-y`, `--toast-swipe-movement-x/y`, `--toast-frontmost-height`) directly, with the 0.75rem gap and peek as `var(--spacing-3)`, written `transform-[…]` instead of `[transform:…]`. It stays `transform` rather than `translate-*` / `scale-*`: Base UI reads the computed `transform` back when a swipe starts and sets an inline one while dragging. The source scan allows such arithmetic on Base UI's variables: spacing variables, unitless numbers and percentages beside them, never a unit. The default and down-swipe exits are one rule, upstream's four `data-expanded:data-ending-style:` copies are dropped (the swipe variants already out-rank `data-expanded:`), and a sideways swipe keeps the toast's own `translateY`. `[transition:transform_500ms_cubic-bezier(…),…,height_150ms]` is `transition-all duration-500 ease-out`, the content's `ease-[cubic-bezier(…)]` is `ease-out`, `rounded-2xl` is `rounded-xl`, `ring-[3px]` is `ring-3`, the hover bridge's `after:h-[calc(var(--gap)+1px)]` is `after:h-3.5`, and `after:content-['']` is dropped (Tailwind v4's `after:` sets it). The viewport is `z-60`, not `z-50`: Base UI leaves it out of a modal dialog's `aria-hidden` and outside-press handling, but at the dialog's own `z-50` the dialog's later portal painted its backdrop over the toast and took every click. Icons are lucide's canonical names (`LoaderCircleIcon`, `TriangleExclamationPointIcon`).
- `field.tsx`: `responsive`'s `@md/field-group:` is `@min-[28rem]/field-group:`. A container query can't read a token through `var()`, so the width is written out: 28rem is `size.md`'s 448px. Field's `leading-snug` reads `line-height.snug`, added for it.
- `alert.tsx`: the icon layout's `has-[>svg]:grid-cols-[auto_1fr]` is `has-[>svg]:justify-start`: the columns stay implicit and `auto`, and not stretching them keeps the icon's column at the icon's width and gives the text the rest. The action's room, `pr-18`, reads `space.18` (72px), added for it. `alertVariants` is exported.
- `badge.tsx`: `rounded-4xl` is `rounded-full` (the same pill on a 20px badge) and `ring-[3px]` is `ring-3`.
- `toggle.tsx`: `transition-[color,box-shadow]` is `transition-all` and `ring-[3px]` is `ring-3`.
- `toggle-group.tsx`: `spacing` is the literal union `0 | 1 | 2`, mapped to `gap-0` / `gap-1` / `gap-2`; upstream took any number into `gap-[--spacing(var(--gap))]`, a value no token holds. `orientation` is passed to Base UI as well as to the `data-` attribute, so the arrow keys follow it. `data-horizontal:` / `data-vertical:` are `data-[orientation=…]:`, and the item's `data-[state=on]:bg-muted` is `data-pressed:bg-muted`: Base UI 1.9 sets neither upstream attribute, so a vertical group didn't stack.
- `avatar.tsx` and `skeleton.tsx` are upstream unchanged. The avatar fallback's `text-muted-foreground` on `bg-muted` (neutral.500 on neutral.100) is 4.36:1, under AA's 4.5:1 for its `text-sm` initials; the pair is the token file's, so the Fallback story turns off only axe's `color-contrast` rule and says so.
- `accordion.tsx` (Base UI Accordion): the trigger's `aria-disabled:` is `disabled:`. Base UI 1.9 disables the trigger as a native button with the `disabled` attribute, so a disabled item never dimmed. The height animation moves onto the panel: upstream put `h-(--accordion-panel-height)` and `data-starting-style:h-0` / `data-ending-style:h-0` on the inner div, which carries none of Base UI's attributes, and animated the panel with tw-animate-css's `animate-accordion-down/up`, whose keyframes read Radix's `--radix-accordion-content-height`, so the height jumped. The panel transitions its own height (`transition-all duration-200 ease-out`) between 0 and Base UI's `--accordion-panel-height`, which joins the source scan's Base UI variables. Upstream has no `"use client"`, and neither does the file.
- `breadcrumb.tsx` is upstream on tokens; the ellipsis icon is lucide's canonical `EllipsisIcon`, not the `MoreHorizontalIcon` alias.
- `card.tsx`: upstream spaced every part with an element-local `--card-spacing` (`[--card-spacing:--spacing(6)]`, `gap-(--card-spacing)`, `px-(--card-spacing)`), and `--spacing(…)` reads Tailwind's `--spacing`, which the theme clears, so the card had no padding or gaps. Each use is the step it means, `6` (24px) and `4` (16px) at `size` sm: `gap-6 py-6` / `data-[size=sm]:gap-4 data-[size=sm]:py-4`, the parts' `px-6` / `group-data-[size=sm]/card:px-4`, and the ruled header's `pb` and footer's `pt` likewise. The header drops `has-data-[slot=card-action]:grid-cols-[1fr_auto]` and `has-data-[slot=card-description]:grid-rows-[auto_auto]`: the action's `col-start-2 row-span-2 justify-self-end` makes the implicit tracks, and its column holds no more than the action, so it still ends at the header's right edge.
- `tabs.tsx` (Base UI Tabs): `data-horizontal:` / `data-vertical:` (and the `group-data-*/tabs:` forms) are `data-[orientation=…]:`. Base UI 1.9 sets only `data-orientation`, so the list never sat above the panel and a vertical list never stacked. `orientation` is passed to Base UI as well as to the `data-` attribute (upstream set only the attribute), so the arrow keys follow it. The list's `p-[3px]` is `p-1` and the trigger's `h-[calc(100%-1px)]` is `h-full` (a 28px tab in the 36px list, upstream's was 29px), the line underline's `bottom-[-5px]` is `-bottom-1`, on the list's foot as the vertical bar's `-right-1` already was, and `ring-[3px]` is `ring-3`. `tabsListVariants` is exported.

The shadcn CLI resolves `components.json`'s `utils` alias to the npm package `cn` and writes `src/components/…` imports: after a pull, point them back at `../lib/utils.js` and `./<name>.js`, and drop any `cn` dependency it added.

Upstream's open and close animations (`animate-in`, `fade-in-0`, `zoom-in-95`, …) come from `tw-animate-css`, which `styles.css` imports after Tailwind.

Naming is the component link: export name = library component name, cva variant keys = the Penpot variant properties with literal-union values (`variant`, `size`), and the cva config is exported (`buttonVariants`).

## Tests

| Tier          | Files                                        | Runner                                                                                                                                 |
| ------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `stories`     | `src/components/*.stories.tsx`               | Vitest browser mode (Chromium) via `@storybook/addon-vitest`; `@storybook/addon-a11y` fails on violations                              |
| `unit`        | `tests/unit/**/*.unit.test.ts(x)`            | Vitest on jsdom, `fetch` throwing: `cn`, the token build, the token checks, the source scan, the story-title and tier-placement checks |
| `integration` | `tests/integration/**/*.integration.spec.ts` | Playwright against `storybook build`, served by `vite preview`; proves the component objects and the Base UI traps                     |

A story's `title` is its library component's Penpot path (`Components/Button`), one story per variant value, each with a `play` function. The component name in that path is the export, so a two-word component is `Components/AlertDialog`, never `Alert Dialog`; the unit tier's story-title check fails a title whose last segment isn't a `.` export. The `design` parameter holds the library component's Penpot URL; no story sets it yet, because the design system library and its component URLs arrive with [ts-packages#51](https://github.com/bRRRITSCOLD/ts-packages/issues/51). A story that opts out of a11y (`parameters: { a11y: { test: 'off' } }`) says why in a comment beside it. The token checks: light and dark define the same semantic tokens, every class a component applies compiles to a utility of the built theme, and each of those utilities reads a token for every token-typed property it sets.

An integration spec opens a story by id (`openStory(page, 'components-dialog--nested')`, from `tests/integration/__utils__/story.ts`), which waits until Storybook has run the story's `play` function: the spec starts from the state `play` leaves. `retries` is 0. The tier-placement check fails a file whose suffix doesn't match its tier directory, and any skipped test or suite in a tier or a stories file (`test.fixme` is allowed).

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

`dialog(root)` drives a Dialog or an Alert Dialog: `root` is the popup (role `dialog` or `alertdialog`), `button(name)` and `field(label)` look inside it, and `dismiss()` presses Escape. Its methods wait; specs assert. The Base UI traps it carries, numbered as in the spec and each proven in `tests/integration/dialog.integration.spec.ts` (trap 3 belongs to Toast, 4 to Combobox and 6 to Select):

- **Trap 1: Escape closes only the top layer.** `dismiss()` waits for its dialog to be on top: a dialog under a nested one is `aria-hidden`, so a root found by role is hidden until the layers above close.
- **Trap 2: the page under a dialog is `aria-hidden`, not `inert`**, so an unscoped `getByLabel` or `getByText` still hits a twin on the page. Every lookup goes through `root`.
- **Trap 5: an exit animation keeps a closing popup mounted** (`data-ending-style`). `dismiss()` returns once the dialog is hidden; a spec asserts closed with auto-waiting `toBeHidden()`, never an immediate count.
- **Trap 7: `data-testid` reaches parts, not Root.** `Dialog` renders no DOM, so a testid on it reaches nothing; put it on `DialogContent` or `DialogTrigger`.

`popover(root)` drives a Popover the same way, from its popup. In a dialog, Escape or a click elsewhere in the dialog closes only the popover (trap 1).

`select(trigger)` drives a Select from its trigger (role `combobox`): `options()` reads the option labels, `select(label)` opens the popup and picks one, `value()` reads what the trigger shows, `dismiss()` presses Escape. The portalled popup is found through the trigger's `aria-controls`, so lookups stay scoped. **Trap 6:** the value lives in a hidden input; never `fill()` it. **Trap 1:** the popup puts a backdrop over the page, so in a dialog Escape or a click outside closes only the select. Proven in `select.integration.spec.ts`.

`combobox(input)` drives a Combobox from its input (role `combobox`): `filter(text)`, `options()`, `select(...labels)`, `value()`, `chips()` in `multiple`, `dismiss()`. **Trap 4:** options carry no value attribute, so everything goes by label; in `multiple` a pick clears the filter and closes the popup (Base UI's default, kept), so `select(...labels)` filters to and picks each label in turn, reopening the popup. **Trap 1:** in a dialog, Escape or a click elsewhere in the dialog closes only the popup. Proven in `combobox.integration.spec.ts`.

`toast(page)` drives the toasts `Toaster` shows, from the page: they render in the `region` named "Notifications". `get(text)` finds a toast by its title or description, `read(text)` returns `{ title, description, priority }`, `titles()` lists the toasts newest first, `button(text, name)` finds its action, `announcer(text)` the high-priority announcer, `close(text)` hovers the toast, clicks its close button and waits until it is hidden, and `waitForHidden(text)` waits out a timeout or swipe. **Trap 3:** a toast is a `dialog`, so an unscoped `getByRole('dialog')` also matches it; a high-priority toast is an `alertdialog`, `aria-hidden` until the viewport gets focus (F6 or Tab), and a visually hidden `role="alert"` outside the region announces its title and description meanwhile. The close button is `aria-hidden` too until the stack expands on hover or the button gets focus, so every lookup includes hidden elements. **Trap 2:** the region is exempt from an open dialog's `aria-hidden`, so a toast shown from a dialog is found, read and closed the same way. **Trap 5:** `close()` returns once the exit animation has unmounted the toast. Proven in `toast.integration.spec.ts`.

`Toaster` renders the provider, portal, viewport and one `Toast` per toast the `toast` manager adds (`toast.add({ title, description, type, priority, actionProps })`); `type` (`success`, `info`, `warning`, `error`, `loading`) only picks the icon. `ToastProvider`, `ToastPortal`, `ToastViewport` and `ToastContent` are exported for a custom toaster; they, `Toaster`, `toast`, `createToastManager` and `useToastManager` are code only, on the drift allowlist.

`toggleGroup(root)` drives a Toggle Group from its root (role `group`; give the group an `aria-label`): `item(label)`, `pressed()` reads the pressed items' labels in order, `press(label)` and `release(label)` click an item unless it is already in that state and wait for it. Items are toggle buttons (`aria-pressed`) even in a single-value group: there is no `radio` to find and no `aria-checked` to read, and pressing an item of a single-value group releases the one before. The group is one tab stop; the arrow keys move between items, along its `orientation`. Proven in `toggle-group.integration.spec.ts`.

`accordion(root)` drives an Accordion from its root, which has no role: put a testid on `Accordion`. `trigger(label)`, `panel(label)` (role `region`, named by its trigger), `expanded()` reads the open items' labels in order, and `open(label)` / `close(label)` click a trigger unless the item is already in that state. **Trap 5:** a closed panel is unmounted, not hidden, once its height animation ends; `close()` returns after that, so a closed item has no panel to read. Opening an item of a single-value accordion closes the one before. A disabled trigger is a native disabled button that ignores the pointer, so `open()` / `close()` throw rather than wait on it. Each trigger is its own tab stop: Base UI 1.9 dropped the accordion's roving focus (following the APG), so the arrow keys do nothing and Tab moves between triggers, skipping a disabled one. Proven in `accordion.integration.spec.ts`.

`tabs(root)` drives Tabs from its root, which holds the `tablist` and the panels and has no role: put a testid on `Tabs`. `tab(label)`, `selected()` reads the selected tab's label, `panel(label)` finds a tab's panel by the tab that names it, and `select(label)` clicks a tab and waits until it is selected. Only the selected tab's panel is mounted, but the panel being left stays a moment beside the new one, so never look a panel up as the only `tabpanel`. The arrow keys move focus between tabs without selecting (Base UI's `activateOnFocus` is off); Enter or Space selects. A disabled tab stays focusable (`aria-disabled`) but ignores the pointer, so `select()` throws rather than wait on it. Proven in `tabs.integration.spec.ts`.
