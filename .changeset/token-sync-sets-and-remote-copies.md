---
"@brrritscold/design-core-js": patch
"@brrritscold/design-core-node": patch
---

Token sync: a value change in one set no longer re-applies or flags the users of a same-named token in another set; a reference is followed only within the sets a theme activates together. A copy of a main in another file (a library) is flagged and never re-applied, even when a page-local shape applies the same token, so it is never detached. The docs say to accept the library update before syncing a page design file.
