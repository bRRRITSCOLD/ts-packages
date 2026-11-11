---
'@brrritscold/design-core-js': patch
---

Token sync sets a changed token's value in place instead of removing and re-adding it. When Penpot refuses that (or the type changed) it falls back to remove-then-add one token at a time, retries a failed add once and restores the old token if it still fails, so a run never leaves the file without a token it had. It then re-applies every token whose value changed, and every token referencing one, on the shapes outside component copies that use it (off where it is on, then on where it is off, across pauses). Copies are given time to follow their mains and are left alone when they do, since re-applying on a copy detaches it; only a copy that still resolves differently (one whose text fill was overridden keeps its old font) is re-applied. Each re-applied shape is reported as `re-apply` in `changes`; a shape that doesn't read the token back, or a re-applied copy that still resolves differently, is flagged.
