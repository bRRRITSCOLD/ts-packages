import { z } from '@brrritscold/core-js/zod'

import { designTokenGroupSchema, tokenThemeSchema } from './token-file.js'

/**
 * The library-snapshot schema version this package reads and writes.
 *
 * A Penpot upgrade that changes what the snapshot can say bumps this and the schema together.
 * Version 2 added the token catalog, the token themes and each component's layers.
 */
export const LIBRARY_SNAPSHOT_SCHEMA_VERSION = 2

/**
 * The layer attributes drift rules 7–9 check, named as Penpot names the attribute a token is
 * applied to: fill, stroke colour, radius per corner (`r1`–`r4`), padding per side
 * (`p1`–`p4`), row and column gap, font family, size and weight, letter spacing, shadow and
 * opacity. Position, size, stroke width, rotation and margin are exempt.
 */
export const CHECKED_TOKEN_ATTRIBUTES = [
	'fill',
	'stroke-color',
	'r1',
	'r2',
	'r3',
	'r4',
	'p1',
	'p2',
	'p3',
	'p4',
	'row-gap',
	'column-gap',
	'font-family',
	'font-size',
	'font-weight',
	'letter-spacing',
	'shadow',
	'opacity',
] as const

/** A layer attribute drift rules 7–9 check; see {@link CHECKED_TOKEN_ATTRIBUTES}. */
export type CheckedTokenAttribute = (typeof CHECKED_TOKEN_ATTRIBUTES)[number]

const checkedTokenAttributeSchema = z.enum(CHECKED_TOKEN_ATTRIBUTES)

/**
 * One layer of a main component (the main instance or any layer under it, nested part copies
 * included), keyed by its Penpot layer id. Only the checked attributes count, and a layer with
 * neither an applied token nor an unbound attribute is left out.
 *
 * - `namePath`: the layer names from the component's main instance down to this layer, used
 *   only to name the layer in drift messages.
 * - `appliedTokens`: the token name applied to each checked attribute.
 * - `unbound`: the checked attributes set to a non-default value with no token applied.
 */
export const libraryLayerSchema = z.strictObject({
	namePath: z.array(z.string()).min(1),
	appliedTokens: z.partialRecord(checkedTokenAttributeSchema, z.string()),
	unbound: z.array(checkedTokenAttributeSchema),
})

/** One layer of a main component; see {@link libraryLayerSchema}. */
export type LibraryLayer = z.infer<typeof libraryLayerSchema>

/**
 * One part of a compound library component, keyed by its role in the parts record.
 *
 * `componentId` is the Penpot component id of the library component the part is a copy of,
 * or `null` when the layer is a plain layer rather than a copy (drift rule 3 fails it).
 */
export const libraryComponentPartSchema = z.strictObject({
	componentId: z.string().nullable(),
})

/** One part of a compound library component; see {@link libraryComponentPartSchema}. */
export type LibraryComponentPart = z.infer<typeof libraryComponentPartSchema>

/**
 * One main component of the design system library, normalized: no Penpot objects, no geometry.
 *
 * - `path`: the Penpot group path (`Components`, `Components/Card`, `icon`, `_internal`).
 * - `name`: the component's own name (`Button`, `Header`, `Trash2`).
 * - `variantProperties`: this variant's value per variant property (`{ size: 'sm' }`);
 *   each variant of a component is its own Penpot component with its own id.
 * - `parts`: the compound parts by role, the role being the part's stable name inside this
 *   component, never the layer name a swap gives it.
 * - `exceptionsRecord`: the raw exceptions record from the component's plugin data, parsed
 *   from JSON but not validated (drift rule 5 validates it), absent when there is none.
 * - `layers`: the layers with applied tokens or unbound attributes, by Penpot layer id.
 */
export const libraryComponentSchema = z.strictObject({
	path: z.string(),
	name: z.string(),
	variantProperties: z.record(z.string(), z.string()),
	parts: z.record(z.string(), libraryComponentPartSchema),
	exceptionsRecord: z.unknown().optional(),
	layers: z.record(z.string(), libraryLayerSchema),
})

/** One main component of the design system library; see {@link libraryComponentSchema}. */
export type LibraryComponent = z.infer<typeof libraryComponentSchema>

/**
 * The library snapshot: the normalized record of the design system library the drift check
 * reads in place of Penpot.
 *
 * The header pins the Penpot version and names the library file. `tokens` is the library's
 * token catalog as DTCG sets by name, in the shape of the token file; `tokenThemes` are its
 * themes, sorted by group then name. Components are keyed by Penpot component id, so a rename
 * diffs as a rename. Unknown keys fail, so a format change fails loudly instead of being read
 * wrong.
 */
export const librarySnapshotSchema = z.strictObject({
	schemaVersion: z.literal(LIBRARY_SNAPSHOT_SCHEMA_VERSION),
	penpotVersion: z.string(),
	libraryFileId: z.string(),
	tokens: z.record(z.string(), designTokenGroupSchema),
	tokenThemes: z.array(tokenThemeSchema),
	components: z.record(z.string(), libraryComponentSchema),
})

/** The library snapshot; see {@link librarySnapshotSchema}. */
export type LibrarySnapshot = z.infer<typeof librarySnapshotSchema>
