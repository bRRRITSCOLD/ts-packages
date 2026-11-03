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

**Design token**:
A named design decision (a colour, a space, a type size) defined once in the token file and used by both the design tool and `core-react`.
_Avoid_: variable, style

**Token file**:
The single W3C DTCG file in this repo that holds every design token and is the source of truth for them.
_Avoid_: theme file, tokens.json (as a concept)
