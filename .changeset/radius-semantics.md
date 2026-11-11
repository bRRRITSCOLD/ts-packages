---
"@brrritscold/core-react": minor
---

The `rounded-*` scale is now semantic tokens: `radius-xs`, `radius-sm`, `radius-md`, `radius-lg` and `radius-xl` in `light` and `dark`, each aliasing its `border-radius.*` primitive, in place of `calc()` offsets from `radius` in `styles.css`. Every step keeps its value (2, 6, 8, 10 and 14px), so nothing renders differently. Changing `radius` no longer shifts the whole scale.
