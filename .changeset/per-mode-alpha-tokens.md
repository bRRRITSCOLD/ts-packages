---
'@brrritscold/core-react': minor
---

Eleven per-mode semantic colour tokens replace the remaining `dark:` alpha arms, so one rule per alpha holds in both modes and the design system library and core-gpui can read it from the token file:

- `muted-hover`: the hover fill of Button `outline` and `ghost` and Badge `ghost`, `muted` in light and `muted` at 50% in dark;
- `input-hover`: the hover fill of Select's trigger, `input-background` in light and `input` at 50% in dark;
- `destructive-hover`: Button `destructive`'s hover fill, `destructive` at 20% in light and 30% in dark;
- `destructive-border`: an `aria-invalid` control's border, `destructive` in light and `destructive` at 50% in dark;
- `destructive-ring`: an `aria-invalid` control's ring and Button and Badge `destructive`'s focus ring, `destructive` at 20% in light and 40% in dark;
- `success-ring`, `warning-ring`, `info-ring`: Badge's status focus rings, the status colour at 20% in light and 40% in dark;
- `unchecked-background`: an unchecked Switch's track, `input` in light and `input` at 80% in dark;
- `selected-background`, `selected-border`: a selected choice card (a FieldLabel holding a checked control), `primary` at 5% / 30% in light and 10% / 20% in dark.

Button, Badge, Select, Input, Textarea, Combobox, Checkbox, RadioGroup, Switch, Toggle, Field and the internal InputGroup read them instead of the `dark:` alpha arms. Where an arm also decided which state wins in dark (Button `outline` and `ghost` hovered while expanded, a focused or invalid Button `outline`, a checked and invalid Checkbox or Radio), a `dark:` arm restating the token keeps that precedence. Nothing renders differently in light or dark.
