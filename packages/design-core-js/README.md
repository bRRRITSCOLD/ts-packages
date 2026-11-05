# @brrritscold/design-core-js

The component link between the design system library and `core-react`, as pure code: the resolver, the exceptions-record and library-snapshot schemas, the drift check's rule engine and its coverage report. Browser + node; Penpot lives only at the edges, so everything here takes normalized shapes, never raw Penpot objects.

**Private.** Not published, ignored by Changesets. Spec: [`docs/design-system/SPEC.md` § C](../../docs/design-system/SPEC.md); terms: [`GLOSSARY.md`](../../docs/design-system/GLOSSARY.md).

## Tripwire

**A change to a drift rule, the naming convention or the exceptions record also updates the `design-system` skill in personal-ai.** Agents build `core-react` code from designs by that skill; if it describes rules this package no longer enforces, they build wrong code that the drift check then fails.

## The component link

`resolveComponentLink` (`./component-link`) is the one resolver the drift check, the link inspector and the link reader share, so they can't disagree.

| Library side                                | Code side                                                    |
| ------------------------------------------- | ------------------------------------------------------------ |
| `Components/Button`                         | `Button` from `@brrritscold/core-react`                      |
| `Components/Card/Header` (a compound part)  | `CardHeader`                                                 |
| `icon/Trash2`                               | `Trash2Icon` from `@brrritscold/core-react/icons`            |
| `_internal/Slot` (slot placeholder)         | nothing                                                      |
| variant property `size` = `sm`              | `size="sm"`                                                  |
| variant value `default`                     | prop omitted                                                 |
| variant value `true` / `false`              | boolean                                                      |
| exceptions record `props.disabled.from/map` | `disabled` set from another variant property through the map |
| exceptions record `package`                 | the export is looked up in that package (drift: _unchecked_) |
| exceptions record `slots`                   | roles of parts that are slot placeholders                    |

The exceptions record lives in `sharedPluginData` namespace `brrritscold.core-react`, key `link`, and refers to parts by role, never by layer name.

## Drift rules

`checkDrift` (`./drift-check`). Library → code is an **error**; code → library is a **coverage gap**.

1. Component name (path stripped) → named export in `.`; a component whose exceptions record names another package is reported **unchecked**.
2. Variant property → prop (a boolean or literal union in the code manifest); value → literal in that union; `default` → the prop is optional; an exceptions value map overrides and must cover every value.
3. Compound parts are copies of library components (a plain layer, or a copy of something outside the library, fails), so rule 1 covers them.
4. Components under `icon/` → `<Name>Icon` in `./icons`.
5. The exceptions record is valid against its schema, and every key points at a real prop, variant property, variant value or role.

Coverage gaps: exports with no library component, minus the `allowlist` in `design/drift.config.json`; and literal values of a prop the library sets that no variant uses.
