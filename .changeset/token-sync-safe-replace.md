---
'@brrritscold/design-core-js': patch
---

Token sync sets a changed token's value in place instead of removing and re-adding it. When Penpot refuses that (or the type changed) it falls back to remove-then-add one token at a time, retries a failed add once and restores the old token if it still fails, so a run never leaves the file without a token it had. It then re-applies every token whose value changed, and every token referencing one, on the shapes that use it (toggled off and on across pauses, copies last), reports each as `re-apply` in `changes` and flags a shape that doesn't read the token back.
