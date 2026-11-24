---
'@brrritscold/core-react': minor
---

Two per-mode semantic colour tokens hold the Switch thumb, so the design system library and core-gpui can read its dark colours from the token file:

- `unchecked-thumb`: an unchecked Switch's thumb, `background` in light and `foreground` in dark;
- `checked-thumb`: a checked Switch's thumb, `background` in light and `primary-foreground` in dark.

Switch's thumb reads them (`data-unchecked:bg-unchecked-thumb`, `data-checked:bg-checked-thumb`) instead of the `dark:data-unchecked:bg-foreground` and `dark:data-checked:bg-primary-foreground` arms. Nothing renders differently in light or dark.
