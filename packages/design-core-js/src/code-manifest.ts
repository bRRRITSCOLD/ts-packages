import { z } from '@brrritscold/core-js/zod'

/**
 * A component prop the component link can set from a variant property: a boolean, or a union
 * of literals (each as a string, the way Penpot variant values are).
 *
 * `optional` says whether the prop may be omitted, which is what the variant value `default` does.
 */
export const codePropSchema = z.discriminatedUnion('type', [
	z.strictObject({ type: z.literal('boolean'), optional: z.boolean() }),
	z.strictObject({
		type: z.literal('literals'),
		values: z.array(z.string()),
		optional: z.boolean(),
	}),
])

/** A component prop the component link can set; see {@link codePropSchema}. */
export type CodeProp = z.infer<typeof codePropSchema>

/**
 * The code manifest: everything core-react exposes that the drift check compares the
 * library snapshot against.
 *
 * - `exports`: every value export of the `.` entry; a component lists its boolean and
 *   literal-union props, anything else (`cn`, `buttonVariants`) lists none.
 * - `icons`: the `<Name>Icon` exports of the `./icons` entry.
 */
export const codeManifestSchema = z.strictObject({
	exports: z.record(z.string(), z.strictObject({ props: z.record(z.string(), codePropSchema) })),
	icons: z.array(z.string()),
})

/** The code manifest; see {@link codeManifestSchema}. */
export type CodeManifest = z.infer<typeof codeManifestSchema>

/**
 * Compares two strings in code-unit order, for `Array.prototype.sort`: the code manifest and
 * the drift report sort this way, so they come out the same on every machine and in every locale.
 */
export const compareCodeUnits = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
