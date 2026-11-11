---
"@brrritscold/core-react": minor
---

Ship the design system library snapshot in the tarball as `./library.snapshot.json`, beside `./tokens.json`. It is the library state this release matches, so another renderer (the GPUI library) can vendor tokens and snapshot from one exact core-react version for its drift check.
