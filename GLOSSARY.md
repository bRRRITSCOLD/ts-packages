# Design system

The shared design system that several apps reuse, and how its designs connect to the shared React code in this repo.

## Language

**Design system library**:
The shared library of components and design tokens in the design tool, reused across every app's designs.
_Avoid_: DS file, UI kit, shared file

**Page design**:
A design for one screen of one app, built from design system library components plus anything local to that page.
_Avoid_: mockup, frame, comp

**Promotion**:
A human's decision that part of a page design joins the design system library, carried out in the library, in `core-react` and in its component link together.
_Avoid_: extraction, publishing

**Component link**:
The connection between a design system library component and the `core-react` component that implements it, including how design properties map to props.
_Avoid_: Code Connect, mapping, binding

**Exceptions record**:
The part of a component link stored on a library component that holds only what its names cannot say.
_Avoid_: link data, mapping file, full link

**Slot placeholder**:
A stand-in part inside a library component that a designer swaps for their own component to fill an open area of a compound component.
_Avoid_: slot, children, content area

**Drift check**:
The check that the design system library still agrees with `core-react` under the component link's naming convention.
_Avoid_: sync check, lint, link validation

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
Making the design system library's design tokens match the token file, always in that direction; a change made in the design tool reaches the token file only through a reviewed change to the token file.
_Avoid_: token import, token push
