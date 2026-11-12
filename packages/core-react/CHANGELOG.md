# @brrritscold/core-react

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
