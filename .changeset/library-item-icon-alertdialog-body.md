---
'@brrritscold/core-react': patch
---

The published library snapshot (`./library.snapshot.json`) gains two parts:

- `DropdownMenu/Item` (both variants) has a hidden leading `Icon` part, a 16px `icon/Circle` copy before `Text` with 1.33px strokes in `popover-foreground` (`destructive` on the `destructive` variant), as `DropdownMenuItem`'s `[&_svg]:size-4` icon child draws. A page design shows it and swaps the icon.
- `AlertDialog/Content` (both sizes) has a hidden `Body` slot (`_internal/Slot`) between `Header` and `Footer`, listed in the exceptions record's `slots`, for children between the header and footer.

Both parts are hidden by default, so existing copies look the same. No code changes.
