import { z } from '@brrritscold/core-js/zod'

/**
 * The library-snapshot schema version this package reads and writes.
 *
 * A Penpot upgrade that changes what the snapshot can say bumps this and the schema together.
 */
export const LIBRARY_SNAPSHOT_SCHEMA_VERSION = 1

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
 */
export const libraryComponentSchema = z.strictObject({
	path: z.string(),
	name: z.string(),
	variantProperties: z.record(z.string(), z.string()),
	parts: z.record(z.string(), libraryComponentPartSchema),
	exceptionsRecord: z.unknown().optional(),
})

/** One main component of the design system library; see {@link libraryComponentSchema}. */
export type LibraryComponent = z.infer<typeof libraryComponentSchema>

/**
 * The library snapshot: the normalized record of the design system library the drift check
 * reads in place of Penpot.
 *
 * The header pins the Penpot version and names the library file; components are keyed by
 * Penpot component id, so a rename diffs as a rename. Unknown keys fail, so a format change
 * fails loudly instead of being read wrong.
 */
export const librarySnapshotSchema = z.strictObject({
	schemaVersion: z.literal(LIBRARY_SNAPSHOT_SCHEMA_VERSION),
	penpotVersion: z.string(),
	libraryFileId: z.string(),
	components: z.record(z.string(), libraryComponentSchema),
})

/** The library snapshot; see {@link librarySnapshotSchema}. */
export type LibrarySnapshot = z.infer<typeof librarySnapshotSchema>
