---
'@brrritscold/core-react': minor
---

`font-family.mono` is now `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace`. Before, it began with `ui-monospace`, which Penpot can't render. `styles.css` loads JetBrains Mono (OFL-1.1) from `@fontsource/jetbrains-mono`, pinned at `5.3.0`. It is imported at 400, 500, 600 and 700, the same weights as Inter, so `font-mono` renders the real font in every app without setup. JetBrains Mono turns code ligatures on by default (`=>`, `!=`); set `font-variant-ligatures: none` where they are unwanted.
