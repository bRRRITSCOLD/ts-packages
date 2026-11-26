---
'@brrritscold/design-core-js': patch
---

`TokenSyncPenpot`'s slice types now accept Penpot's plugin API types as they are: methods are declared as methods, `PenpotShape.applyToken` takes optional `properties`, and `PenpotTokenTheme.addSet` / `removeSet` take a set or its name as the typings do. A type-level contract now covers every member the token sync reads or calls.
