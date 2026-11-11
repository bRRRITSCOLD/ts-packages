---
"@brrritscold/core-react": patch
---

Pin `lucide-react` exactly (`1.68.0`, the version already resolved). Every later Lucide bump is a deliberate core-react release: a minor when it only adds icons, a major when it renames or removes one. Other renderers vendor Lucide at the version core-react names, so the icon set can no longer drift between an app's install and the release that was checked.
