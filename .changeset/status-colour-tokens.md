---
'@brrritscold/core-react': minor
---

Status colours: `success`, `warning` and `info` semantic tokens, each with a `-foreground` and a `-background`, and Badge variants for them.

- `success` is green, `warning` amber and `info` blue: `green.800`, `amber.800` and `blue.700` in light, the 400 step in dark. The green, amber and blue 400 and 600 steps, `green.800`, `amber.800` and `blue.700` join the primitives.
- `<status>-background` is the 600 step at 10% in light, and the status colour at 20% in dark, as `destructive-background` is.
- `<status>-foreground` is text on the solid colour at 4.5:1 or more: `white` in light, `neutral.950` in dark.
- Badge `success`, `warning` and `info` read `text-<status>` on `bg-<status>-background`, shaped like `destructive`, at 5.8:1 or more in both modes. Utilities such as `bg-success`, `text-warning-foreground` and `bg-info-background` come with the tokens.
