---
"@brrritscold/core-react": minor
---

`StateDot` and `Checks`, promoted from a page design (#156). `StateDot` draws an agent's `state` (`working` | `blocked` | `done` | `idle` | `unknown` | `exited` | `exited-error`) as a 16px mark, a lucide icon or an 8px dot in the state's status token; `Checks` draws a PR's checks `state` (`success` | `pending` | `failure`) as a 14px icon beside its children, the label, at `text-xs`. `LoaderCircle` spins for `working` and `pending`. Their cva configs ship as `stateDotVariants` and `checksVariants`.
