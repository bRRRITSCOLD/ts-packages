---
"@brrritscold/core-react": patch
---

`font-family.sans` is now `Inter, ui-sans-serif, system-ui, sans-serif`, and `styles.css` loads Inter itself (`@fontsource/inter` 5.3.0, weights 400/500/600/700), so every app, the Penpot library and the GPUI renderer render the same glyphs. Text metrics shift slightly where the system font differed. Nothing to change in apps.
