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

Button, Badge, Select, Input, Textarea, Combobox, Checkbox, RadioGroup, Switch, Toggle, Field and the internal InputGroup read them instead of the `dark:` arms, and Button `outline` drops its `dark:border-input` (equal to `border` in both modes). Light renders exactly as before. Dark renders as before at rest; three state combinations now follow light's rule, because a `dark:` arm no longer outranks it: a focused Button `outline` shows the `ring` border, an expanded Button `outline` or `ghost` keeps `muted` while hovered, and a checked, invalid Checkbox or Radio keeps its `primary` border.
