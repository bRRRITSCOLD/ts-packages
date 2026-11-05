# Design system

The shared design system that several apps reuse, and how its designs connect to the shared React code in this repo.

## Language

**Design system library**:
The shared library of components and design tokens in the design tool, reused across every app's designs.
_Avoid_: DS file, UI kit, shared file

**Page design**:
A design for one screen of one app, built from design system library components plus anything local to that page.
_Avoid_: mockup, frame, comp

**Component library**:
The code package (`core-react`) that implements every design system library component; the code side of the component link.
_Avoid_: UI kit, design system (alone)

**Promotion**:
A human's decision to add something from a page design to the design system library (a new component, a new icon, or a new variant of an existing component), carried out in `core-react` first and then in the library and its component link. Changing what the library already has is never promotion.
_Avoid_: extraction, publishing

**Component link**:
The connection between a design system library component and the `core-react` component that implements it, including how design properties map to props.
_Avoid_: Code Connect, mapping, binding

**Exceptions record**:
The part of a component link stored on a library component that holds only what its names cannot say.
_Avoid_: link data, mapping file, full link

**Link inspector**:
The view inside the design tool that shows a person the component link for whatever they select; it shows, never edits.
_Avoid_: plugin, Code Connect panel, dev mode

**Link reader**:
What an agent uses to get the component link for everything on a page design in one call; the agent's counterpart to the link inspector.
_Avoid_: screen reader, read-screen

**Slot placeholder**:
A stand-in part inside a library component that a designer swaps for their own component to fill an open area of a compound component.
_Avoid_: slot, children, content area

**Drift check**:
The check that the design system library still agrees with `core-react` under the component link's naming convention.
_Avoid_: sync check, lint, link validation

**Library snapshot**:
A normalized record of the design system library, kept in this repo, that the drift check reads in place of the design tool itself.
_Avoid_: export, dump, backup

**Snapshot refresh**:
Re-reading the design system library into the library snapshot and proposing the change for review; the only way the snapshot changes.
_Avoid_: sync, pull, import

**Code manifest**:
The description of everything `core-react` exposes (components, their props and allowed values, icons) that the drift check compares the library snapshot against.
_Avoid_: API surface, schema, docgen

**Coverage gap**:
Something `core-react` exposes that has no counterpart in the design system library; reported, never drift.
_Avoid_: missing component, reverse drift

**Design token**:
A named design decision (a colour, a space, a type size) defined once in the token file and used by both the design tool and `core-react`.
_Avoid_: variable, style

**Token file**:
The single W3C DTCG file in this repo that holds every design token and is the source of truth for them.
_Avoid_: theme file, tokens.json (as a concept)

**Primitive token**:
A design token holding a raw value from the palette or a scale, with no meaning of its own (a specific slate shade, a step on the spacing scale).
_Avoid_: base token, global token, core token

**Semantic token**:
A design token that names a role in the interface (background, primary, border) and points at a primitive token; it is what components use, and it can point at a different primitive per mode.
_Avoid_: alias token, theme token

**Token sync**:
Making the design tokens in the design tool (the design system library and every page design) match the token file, always in that direction; a change made in the design tool reaches the token file only through a reviewed change to the token file.
_Avoid_: token import, token push

**Token migration**:
A recorded rename or removal of a design token, naming the token that replaces it, so everything that used the old token can be moved to the new one.
_Avoid_: token rename, deprecation

**Applied token**:
A design token attached to one attribute of a layer in the design tool, so the layer follows that token's value in every mode.
_Avoid_: binding, token link, style

**Raw value**:
A value set directly on a layer attribute instead of coming from a design token.
_Avoid_: hardcoded value, literal, magic value

**Automation profile**:
The design tool account that unattended reads and exports run as; it can view every team's designs but never edit them.
_Avoid_: bot, service account, CI user

**Outside designer**:
A person outside this machine who designs pages with the design system library, through their own design tool account and their own agent; they propose promotions but never change the library directly.
_Avoid_: guest, collaborator, contractor

**Capture**:
A screenshot of one app surface in one state, at one viewport and theme, taken for a person to look at; it asserts nothing.
_Avoid_: snapshot, visual test, screenshot test

**Design comparison**:
A capture shown beside the page design it was built from, for a person to judge by eye.
_Avoid_: visual regression, pixel diff

**Component object**:
The test-side driver for one `core-react` component, shipped with it, that operates it the way a person would.
_Avoid_: page object, test helper
