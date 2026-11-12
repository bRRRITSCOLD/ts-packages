---
'@brrritscold/core-react': minor
---

Status colours: `success`, `warning` and `info` semantic tokens, each with a `-foreground` and a `-background`, and Badge variants for them.

- `success` is green, `warning` amber and `info` blue: the 600 step in light and the 400 step in dark. The green, amber and blue 400 and 600 steps join the primitives.
- `<status>-background` is the colour at 10% in light and 20% in dark, as `destructive-background` is.
- `<status>-foreground` is text on the solid colour at 4.5:1 or more: `neutral.950`, or `white` on light's `blue.600`.
- Badge `success`, `warning` and `info` read `text-<status>` on `bg-<status>-background`, shaped like `destructive`. Utilities such as `bg-success`, `text-warning-foreground` and `bg-info-background` come with the tokens.
