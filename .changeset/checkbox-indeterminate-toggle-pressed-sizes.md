---
'@brrritscold/core-react': patch
---

`Checkbox` draws its indeterminate state: `indeterminate` fills the box with `primary`, as `checked` does, and shows `MinusIcon` in place of `CheckIcon`. Before, Base UI's `data-indeterminate` matched no class, so an indeterminate checkbox (a data table's select-all with some rows picked) drew a check on an empty box.

The published library snapshot (`./library.snapshot.json`) follows:

- `Checkbox` gains an `indeterminate` variant property (`true` / `false`). Its one `indeterminate=true` variant (unchecked, enabled, valid) is the filled box with a 14px `icon/Minus` at a 1.167px stroke on `primary-foreground`. Every other variant is unchanged and reads `indeterminate=false`.
- `Toggle` gains `pressed=true` at sizes `sm` and `lg`, for both `default` and `outline`: the `pressed=false` main with its fill on `muted`, as `aria-pressed:bg-muted` draws.
