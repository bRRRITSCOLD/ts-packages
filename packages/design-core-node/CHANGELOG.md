# @brrritscold/design-core-node

## 0.1.3

### Patch Changes

- [#173](https://github.com/bRRRITSCOLD/ts-packages/pull/173) [`dc65bc5`](https://github.com/bRRRITSCOLD/ts-packages/commit/dc65bc53f80914b72489f040aecf7c76926f2e0e) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - Token sync: a value change in one set no longer re-applies or flags the users of a same-named token in another set; a reference is followed only within the sets a theme activates together. A copy of a main in another file (a library) is flagged and never re-applied, even when a page-local shape applies the same token, so it is never detached. The docs say to accept the library update before syncing a page design file.

- Updated dependencies [[`7657f30`](https://github.com/bRRRITSCOLD/ts-packages/commit/7657f30f91a6695ff3b48bfeb50c5565fefa8486), [`dc65bc5`](https://github.com/bRRRITSCOLD/ts-packages/commit/dc65bc53f80914b72489f040aecf7c76926f2e0e)]:
  - @brrritscold/design-core-js@0.2.0

## 0.1.2

### Patch Changes

- [#130](https://github.com/bRRRITSCOLD/ts-packages/pull/130) [`39f0d84`](https://github.com/bRRRITSCOLD/ts-packages/commit/39f0d841d151a27175e6da2f7f152d3f53914e7c) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - The token sync steps in the README say what `changes` and `flagged` now hold (re-applied shapes, shapes that didn't read a changed token back or still resolve it differently; copies that followed their main aren't listed), what to do when the script throws naming tokens it couldn't replace, and to keep the Penpot tab visible while it runs.

- Updated dependencies [[`39f0d84`](https://github.com/bRRRITSCOLD/ts-packages/commit/39f0d841d151a27175e6da2f7f152d3f53914e7c)]:
  - @brrritscold/design-core-js@0.1.1

## 0.1.1

### Patch Changes

- [#126](https://github.com/bRRRITSCOLD/ts-packages/pull/126) [`03f7425`](https://github.com/bRRRITSCOLD/ts-packages/commit/03f74251685c10b6b95428641a9ab120f304cd05) Thanks [@bRRRITSCOLD](https://github.com/bRRRITSCOLD)! - The drift report says "the code" instead of "core-react" in its headline, coverage-gap summary and annotation, because other renderers (core-gpui) run the same checker against their own manifest.
