---
'@brrritscold/design-core-js': patch
---

Token sync no longer re-applies a changed token on a component copy when no shape outside a copy applies that token on that property, as in a page design file, whose mains live in the library. Re-applying detached each such copy from its main, so later library updates stopped reaching it. The copy is left to follow its main once the file accepts the library update, and is flagged, to re-apply by hand only if it still resolves the old value then.
