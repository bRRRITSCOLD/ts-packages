---
'@brrritscold/core-react': minor
---

An `overlay` semantic token holds the scrim behind a modal popup: `foreground` at 10% in light and `background` at 10% in dark (near-black in both). Dialog, AlertDialog and Sheet's overlays read `bg-overlay` instead of `bg-foreground/10 dark:bg-background/10`, so the design system library can apply it. Nothing renders differently.
