# @brrritscold/design-core-js

## 0.2.0

### Minor Changes

- [#175](https://github.com/bRRRITSCOLD/ts-packages/pull/175) [`7657f30`](https://github.com/bRRRITSCOLD/ts-packages/commit/7657f30f91a6695ff3b48bfeb50c5565fefa8486) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Add `./stale-colours`: `findStaleColours` lists the layers of a page design file whose stored fill or stroke colour differs from their applied token's value in the file's active theme (Light colours left on library copies in a Dark file), with `resolveColourTokens` and `parseColour`.

### Patch Changes

- [#173](https://github.com/bRRRITSCOLD/ts-packages/pull/173) [`dc65bc5`](https://github.com/bRRRITSCOLD/ts-packages/commit/dc65bc53f80914b72489f040aecf7c76926f2e0e) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Token sync: a value change in one set no longer re-applies or flags the users of a same-named token in another set; a reference is followed only within the sets a theme activates together. A copy of a main in another file (a library) is flagged and never re-applied, even when a page-local shape applies the same token, so it is never detached. The docs say to accept the library update before syncing a page design file.

## 0.1.2

### Patch Changes

- [#140](https://github.com/bRRRITSCOLD/ts-packages/pull/140) [`6d80f79`](https://github.com/bRRRITSCOLD/ts-packages/commit/6d80f79fd658a28dfa771be15cac9acc1dd0126a) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Token sync no longer re-applies a changed token on a component copy when no shape outside a copy applies that token on that property, as in a page design file, whose mains live in the library. Re-applying detached each such copy from its main, so later library updates stopped reaching it. The copy is left to follow its main once the file accepts the library update, and is flagged, to re-apply by hand only if it still resolves the old value then.

## 0.1.1

### Patch Changes

- [#130](https://github.com/bRRRITSCOLD/ts-packages/pull/130) [`39f0d84`](https://github.com/bRRRITSCOLD/ts-packages/commit/39f0d841d151a27175e6da2f7f152d3f53914e7c) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Token sync sets a changed token's value in place instead of removing and re-adding it. When Penpot refuses that (or the type changed) it falls back to remove-then-add one token at a time, retries a failed add once and restores the old token if it still fails, so a run never leaves the file without a token it had. It then re-applies every token whose value changed, and every token referencing one, on the shapes outside component copies that use it (off where it is on, then on where it is off, across pauses). Copies are given time to follow their mains and are left alone when they do, since re-applying on a copy detaches it; only a copy that still resolves differently (one whose text fill was overridden keeps its old font) is re-applied. Each re-applied shape is reported as `re-apply` in `changes`; a shape that doesn't read the token back, or a re-applied copy that still resolves differently, is flagged.
