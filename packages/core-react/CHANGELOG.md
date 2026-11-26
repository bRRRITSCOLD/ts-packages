# @brrritscold/core-react

## 1.8.1

### Patch Changes

- [#200](https://github.com/bRRRITSCOLD/ts-packages/pull/200) [`d12ca6f`](https://github.com/bRRRITSCOLD/ts-packages/commit/d12ca6fd856c62b5a1583a9b07194476fb647516) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - The published library snapshot (`./library.snapshot.json`) gains `icon/Columns2`, `icon/Rows2`, `icon/Link`, `icon/Unlink` and `icon/Copy`, built from lucide-react 1.68.0's icon data like the other icon twins, so a page design's `DropdownMenu/Item` can swap them into its `Icon` part. No code changes: `./icons` already exports `Columns2Icon`, `Rows2Icon`, `LinkIcon`, `UnlinkIcon` and `CopyIcon`.

## 1.8.0

### Minor Changes

- [#194](https://github.com/bRRRITSCOLD/ts-packages/pull/194) [`c67de84`](https://github.com/bRRRITSCOLD/ts-packages/commit/c67de84846f7e2f1f480432166857068faa45eec) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Two per-mode semantic colour tokens hold the Switch thumb, so the design system library and core-gpui can read its dark colours from the token file:
  - `unchecked-thumb`: an unchecked Switch's thumb, `background` in light and `foreground` in dark;
  - `checked-thumb`: a checked Switch's thumb, `background` in light and `primary-foreground` in dark.

  Switch's thumb reads them (`data-unchecked:bg-unchecked-thumb`, `data-checked:bg-checked-thumb`) instead of the `dark:data-unchecked:bg-foreground` and `dark:data-checked:bg-primary-foreground` arms. Nothing renders differently in light or dark.

## 1.7.2

### Patch Changes

- [#191](https://github.com/bRRRITSCOLD/ts-packages/pull/191) [`c0ebf01`](https://github.com/bRRRITSCOLD/ts-packages/commit/c0ebf0159bf6c2246f564cbd153a2ca5a40acab1) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - The published library snapshot (`./library.snapshot.json`) gains `icon/Lock`, built from lucide-react 1.68.0's icon data like the other icon twins, and `DropdownMenu/SubContent` gains the parts `DropdownMenu/Content` has: a `Label`, `Item`s, a `Separator` and a last `Item`, so a page design can draw a submenu with a separator and a third item. The `Submenu` story shows the same (a "Share via" group with Email and Message, a separator, then "More…"). No code changes: `./icons` already exports `LockIcon`, and `DropdownMenuSubContent` already takes any children.

## 1.7.1

### Patch Changes

- [#186](https://github.com/bRRRITSCOLD/ts-packages/pull/186) [`ff2795b`](https://github.com/bRRRITSCOLD/ts-packages/commit/ff2795bbc3315a3b3787aa6839711eb977fbbe7f) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - The published library snapshot (`./library.snapshot.json`) gains four icon twins, built from lucide-react 1.68.0's icon data: `icon/ExternalLink`, `icon/GitMerge`, `icon/GitPullRequestClosed` and `icon/GitPullRequestDraft`. Each is a 24×24 board with no fill, `Stroke N` layers with constraints `scale`, and 2px centred strokes in `foreground`, like the other icon twins. No code changes: `./icons` already exports `ExternalLinkIcon`, `GitMergeIcon`, `GitPullRequestClosedIcon` and `GitPullRequestDraftIcon`.

## 1.7.0

### Minor Changes

- [#177](https://github.com/bRRRITSCOLD/ts-packages/pull/177) [`e053ece`](https://github.com/bRRRITSCOLD/ts-packages/commit/e053ece26926d8000dae9e0e4f849a87b9ed0180) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Eleven per-mode semantic colour tokens replace the remaining `dark:` alpha arms, so one rule per alpha holds in both modes and the design system library and core-gpui can read it from the token file:
  - `muted-hover`: the hover fill of Button `outline` and `ghost` and Badge `ghost`, `muted` in light and `muted` at 50% in dark;
  - `input-hover`: the hover fill of Select's trigger, `input-background` in light and `input` at 50% in dark;
  - `destructive-hover`: Button `destructive`'s hover fill, `destructive` at 20% in light and 30% in dark;
  - `destructive-border`: an `aria-invalid` control's border, `destructive` in light and `destructive` at 50% in dark;
  - `destructive-ring`: an `aria-invalid` control's ring and Button and Badge `destructive`'s focus ring, `destructive` at 20% in light and 40% in dark;
  - `success-ring`, `warning-ring`, `info-ring`: Badge's status focus rings, the status colour at 20% in light and 40% in dark;
  - `unchecked-background`: an unchecked Switch's track, `input` in light and `input` at 80% in dark;
  - `selected-background`, `selected-border`: a selected choice card (a FieldLabel holding a checked control), `primary` at 5% / 30% in light and 10% / 20% in dark.

  Button, Badge, Select, Input, Textarea, Combobox, Checkbox, RadioGroup, Switch, Toggle, Field and the internal InputGroup read them instead of the `dark:` alpha arms. Where an arm also decided which state wins in dark (Button `outline` and `ghost` hovered while expanded, a focused or invalid Button `outline`, a checked and invalid Checkbox or Radio), a `dark:` arm restating the token keeps that precedence. Nothing renders differently in light or dark.

### Patch Changes

- [#183](https://github.com/bRRRITSCOLD/ts-packages/pull/183) [`fa084a3`](https://github.com/bRRRITSCOLD/ts-packages/commit/fa084a3f2d5be21d9fd5908baf35b12f71b786b6) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - `Checkbox` draws its indeterminate state: `indeterminate` fills the box with `primary`, as `checked` does, and shows `MinusIcon` in place of `CheckIcon`. Before, Base UI's `data-indeterminate` matched no class, so an indeterminate checkbox (a data table's select-all with some rows picked) drew a check on an empty box.

  The published library snapshot (`./library.snapshot.json`) follows:
  - `Checkbox` gains an `indeterminate` variant property (`true` / `false`). Its one `indeterminate=true` variant (unchecked, enabled, valid) is the filled box with a 14px `icon/Minus` at a 1.167px stroke on `primary-foreground`. Every other variant is unchanged and reads `indeterminate=false`.
  - `Toggle` gains `pressed=true` at sizes `sm` and `lg`, for both `default` and `outline`: the `pressed=false` main with its fill on `muted`, as `aria-pressed:bg-muted` draws.

- [#181](https://github.com/bRRRITSCOLD/ts-packages/pull/181) [`93cb980`](https://github.com/bRRRITSCOLD/ts-packages/commit/93cb980891e51cb30c14d83ce2866de76ee05233) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - The published library snapshot (`./library.snapshot.json`) gains two parts:
  - `DropdownMenu/Item` (both variants) has a hidden leading `Icon` part, a 16px `icon/Circle` copy before `Text` with 1.33px strokes in `popover-foreground` (`destructive` on the `destructive` variant), as `DropdownMenuItem`'s `[&_svg]:size-4` icon child draws. A page design shows it and swaps the icon.
  - `AlertDialog/Content` (both sizes) has a hidden `Body` slot (`_internal/Slot`) between `Header` and `Footer`, listed in the exceptions record's `slots`, for children between the header and footer.

  Both parts are hidden by default, so existing copies look the same. No code changes.

## 1.6.0

### Minor Changes

- [#165](https://github.com/bRRRITSCOLD/ts-packages/pull/165) [`87767c3`](https://github.com/bRRRITSCOLD/ts-packages/commit/87767c3eb04da5e5f96d45eb6f1dd8103506da60) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - `merged` colour tokens for a merged pull request, GitHub's merged purple on this palette: `merged`, `merged-foreground` and `merged-background` (light and dark), built as the status colours are, on new `violet` 400, 600 and 700 primitives. Utilities `text-merged`, `bg-merged`, `text-merged-foreground` and `bg-merged-background`.

## 1.5.0

### Minor Changes

- [#160](https://github.com/bRRRITSCOLD/ts-packages/pull/160) [`36bf77d`](https://github.com/bRRRITSCOLD/ts-packages/commit/36bf77d3e6ce846adb35de38d773ddc754c31489) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - `StateDot` and `Checks`, promoted from a page design ([#156](https://github.com/bRRRITSCOLD/ts-packages/issues/156)). `StateDot` draws an agent's `state` (`working` | `blocked` | `done` | `idle` | `unknown` | `exited` | `exited-error`) as a 16px mark, a lucide icon or an 8px dot in the state's status token; `Checks` draws a PR's checks `state` (`success` | `pending` | `failure`) as a 14px icon beside its children, the label, at `text-xs`. `LoaderCircle` spins for `working` and `pending`. Their cva configs ship as `stateDotVariants` and `checksVariants`.

## 1.4.0

### Minor Changes

- [#154](https://github.com/bRRRITSCOLD/ts-packages/pull/154) [`3a85318`](https://github.com/bRRRITSCOLD/ts-packages/commit/3a853189227cd81ece0d1ef7240c9bfdc635e0af) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Sidebar, promoted from a page design: a static, non-collapsible sidebar with `Sidebar` (an `<aside>` at `--sidebar-width`, 256px by default), `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` (`isActive` → `data-active`, and Base UI's `render` for links), `SidebarMenuBadge`, `SidebarSeparator` and `SidebarFooter`. Eight new semantic tokens per mode, shadcn's `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border` and `sidebar-ring` (each equal to its general token except the fill: `neutral.50` in light, `neutral.900` in dark), and the `space.64` (256px) primitive.

## 1.3.0

### Minor Changes

- [#151](https://github.com/bRRRITSCOLD/ts-packages/pull/151) [`b82ad3e`](https://github.com/bRRRITSCOLD/ts-packages/commit/b82ad3e521884c6b99e7be60b2b106f216a10ec7) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - `font-family.mono` is now `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace`. Before, it began with `ui-monospace`, which Penpot can't render. `styles.css` loads JetBrains Mono (OFL-1.1) from `@fontsource/jetbrains-mono`, pinned at `5.3.0`. It is imported at 400, 500, 600 and 700, the same weights as Inter, so `font-mono` renders the real font in every app without setup. JetBrains Mono turns code ligatures on by default (`=>`, `!=`); set `font-variant-ligatures: none` where they are unwanted.

- [#150](https://github.com/bRRRITSCOLD/ts-packages/pull/150) [`ebddc03`](https://github.com/bRRRITSCOLD/ts-packages/commit/ebddc035419212393c755ca7e391f5613f112758) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - An `overlay` semantic token holds the scrim behind a modal popup: `foreground` at 10% in light and `background` at 10% in dark (near-black in both). Dialog, AlertDialog and Sheet's overlays read `bg-overlay` instead of `bg-foreground/10 dark:bg-background/10`, so the design system library can apply it. Nothing renders differently.

- [#150](https://github.com/bRRRITSCOLD/ts-packages/pull/150) [`ebddc03`](https://github.com/bRRRITSCOLD/ts-packages/commit/ebddc035419212393c755ca7e391f5613f112758) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Status colours: `success`, `warning` and `info` semantic tokens, each with a `-foreground` and a `-background`, and Badge variants for them.
  - `success` is green, `warning` amber and `info` blue: `green.800`, `amber.800` and `blue.700` in light, the 400 step in dark. The green, amber and blue 400 and 600 steps, `green.800`, `amber.800` and `blue.700` join the primitives.
  - `<status>-background` is the 600 step at 10% in light, and the status colour at 20% in dark, as `destructive-background` is.
  - `<status>-foreground` is text on the solid colour at 4.5:1 or more: `white` in light, `neutral.950` in dark.
  - Badge `success`, `warning` and `info` read `text-<status>` on `bg-<status>-background`, shaped like `destructive`, at 5.8:1 or more in both modes. Utilities such as `bg-success`, `text-warning-foreground` and `bg-info-background` come with the tokens.

## 1.2.0

### Minor Changes

- [#135](https://github.com/bRRRITSCOLD/ts-packages/pull/135) [`52c9346`](https://github.com/bRRRITSCOLD/ts-packages/commit/52c9346eaa92968a3468fe2d2da2afae2c6b2b2c) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Three per-mode semantic colour tokens hold the fills whose alpha changes by mode, so the design system library can apply them:
  - `input-background`: a form field's fill, `transparent` in light and `input` at 30% in dark;
  - `outline-background`: an outlined control raised on its surface (Button `outline`, the active tab), `background` in light and `input-background` in dark;
  - `destructive-background`: the tint behind destructive text, `destructive` at 10% in light and 20% in dark.

  Button, Badge, DropdownMenu, Input, Textarea, Select, Combobox, Checkbox, RadioGroup, Tabs and the internal InputGroup read them (`bg-input-background`, `bg-outline-background`, `bg-destructive-background`) instead of `dark:bg-input/30` and `bg-destructive/10 dark:bg-destructive/20` arms. Nothing renders differently: every story matches pixel for pixel in light and dark. The library twins apply the new tokens, and every corner carries its `radius-<step>`.

## 1.1.0

### Minor Changes

- [#117](https://github.com/bRRRITSCOLD/ts-packages/pull/117) [`bbede31`](https://github.com/bRRRITSCOLD/ts-packages/commit/bbede31c237b8ebcfd751ed12467d5344e6e55d3) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - The `rounded-*` scale is now semantic tokens: `radius-xs`, `radius-sm`, `radius-md`, `radius-lg` and `radius-xl` in `light` and `dark`, each aliasing its `border-radius.*` primitive, in place of `calc()` offsets from `radius` in `styles.css`. Every step keeps its value (2, 6, 8, 10 and 14px), so nothing renders differently. Changing `radius` no longer shifts the whole scale.

- [#114](https://github.com/bRRRITSCOLD/ts-packages/pull/114) [`aaa7cd9`](https://github.com/bRRRITSCOLD/ts-packages/commit/aaa7cd9302854ca04e866291941f3033f3f7583e) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Ship the design system library snapshot in the tarball as `./library.snapshot.json`, beside `./tokens.json`. It is the library state this release matches, so another renderer (the GPUI library) can vendor tokens and snapshot from one exact core-react version for its drift check.

### Patch Changes

- [#119](https://github.com/bRRRITSCOLD/ts-packages/pull/119) [`79e4608`](https://github.com/bRRRITSCOLD/ts-packages/commit/79e46080a8f320373e00e0c4529b1224e38267af) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - `font-family.sans` is now `Inter, ui-sans-serif, system-ui, sans-serif`, and `styles.css` loads Inter itself (`@fontsource/inter` 5.3.0, weights 400/500/600/700), so every app, the Penpot library and the GPUI renderer render the same glyphs. Text metrics shift slightly where the system font differed. Nothing to change in apps.

- [#112](https://github.com/bRRRITSCOLD/ts-packages/pull/112) [`076f698`](https://github.com/bRRRITSCOLD/ts-packages/commit/076f698cbb338f9b89be82da56ae35f27794b531) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Pin `lucide-react` exactly (`1.68.0`, the version already resolved). Every later Lucide bump is a deliberate core-react release: a minor when it only adds icons, a major when it renames or removes one. Other renderers vendor Lucide at the version core-react names, so the icon set can no longer drift between an app's install and the release that was checked.

## 1.0.0

### Major Changes

- [#104](https://github.com/bRRRITSCOLD/ts-packages/pull/104) [`0a29abd`](https://github.com/bRRRITSCOLD/ts-packages/commit/0a29abd8121888db23270650e8fd71a4df8872b9) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - First release. shadcn (Base UI) React components on Tailwind v4, themed from one design token file (`styles.css`, `tokens.json`), icons at `./icons`, the data table at `./data-table` and Playwright component objects at `./testing`. Each component is linked to its twin in the Penpot design system library. Docs: https://brrritscold.github.io/ts-packages/core-react/
