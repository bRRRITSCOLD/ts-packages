---
'@brrritscold/core-react': patch
---

The published library snapshot (`./library.snapshot.json`) gains `icon/Lock`, built from lucide-react 1.68.0's icon data like the other icon twins, and `DropdownMenu/SubContent` gains the parts `DropdownMenu/Content` has: a `Label`, `Item`s, a `Separator` and a last `Item`, so a page design can draw a submenu with a separator and a third item. The `Submenu` story shows the same (a "Share via" group with Email and Message, a separator, then "More…"). No code changes: `./icons` already exports `LockIcon`, and `DropdownMenuSubContent` already takes any children.
