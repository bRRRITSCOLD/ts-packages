---
'@brrritscold/core-react': minor
---

Three per-mode semantic colour tokens hold the fills whose alpha changes by mode, so the design system library can apply them:

- `input-background`: a form field's fill, `transparent` in light and `input` at 30% in dark;
- `outline-background`: an outlined control raised on its surface (Button `outline`, the active tab), `background` in light and `input-background` in dark;
- `destructive-background`: the tint behind destructive text, `destructive` at 10% in light and 20% in dark.

Button, Badge, DropdownMenu, Input, Textarea, Select, Combobox, Checkbox, RadioGroup, Tabs and the internal InputGroup read them (`bg-input-background`, `bg-outline-background`, `bg-destructive-background`) instead of `dark:bg-input/30` and `bg-destructive/10 dark:bg-destructive/20` arms. Nothing renders differently: every story matches pixel for pixel in light and dark. The library twins apply the new tokens, and every corner carries its `radius-<step>`.
