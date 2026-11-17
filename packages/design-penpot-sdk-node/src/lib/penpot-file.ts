// What every normalizer of a raw `get-file` answer shares: the "changed shape" error, strict
// parsing of the fields it reads, and the tokens lib.

import { z } from '@brrritscold/core-js/zod'
import { compareCodeUnits } from '@brrritscold/design-core-js/code-manifest'
import {
	type DesignToken,
	type DesignTokenGroup,
	designTokenGroupSchema,
	type TokenTheme,
} from '@brrritscold/design-core-js/token-file'

import { PENPOT_VERSION } from '../rpc.js'

/** The id of a page's root frame, the parent of every top-level layer. */
export const ROOT_FRAME_ID = '00000000-0000-0000-0000-000000000000'

/** Thrown when `get-file` no longer has the shape the normalizer reads. */
export const shapeChanged = (where: string, detail: string) =>
	new Error(
		`Penpot get-file changed shape at ${where} (this package reads Penpot ${PENPOT_VERSION}): ${detail}`
	)

/** Parses what a normalizer reads, throwing {@link shapeChanged} naming `where` when it doesn't fit. */
export const parse = <T>(schema: z.ZodType<T>, value: unknown, where: string): T => {
	const result = schema.safeParse(value)
	if (!result.success) throw shapeChanged(where, z.prettifyError(result.error))
	return result.data
}

/** `{ b: …, a: … }` → `{ a: …, b: … }`, so the snapshot serializes the same every time. */
export const sortKeys = <V>(record: Record<string, V>): Record<string, V> =>
	Object.fromEntries(Object.entries(record).sort(([a], [b]) => compareCodeUnits(a, b)))

/**
 * The tokens lib as JSON `get-file` sends it: Penpot's own DTCG export, the sets by name plus
 * `$themes` and `$metadata`. Absent (or `null`) in a file that never had a token.
 */
const rawThemeSchema = z.object({
	group: z.string(),
	name: z.string(),
	selectedTokenSets: z.record(z.string(), z.literal('enabled')),
})

const TOKENS_LIB_META_KEYS = new Set(['$themes', '$metadata'])

/** A DTCG group with its groups sorted and Penpot's empty `$description` dropped. */
const normalizeTokenGroup = (group: DesignTokenGroup): DesignTokenGroup =>
	sortKeys(
		Object.fromEntries(
			Object.entries(group).map(([name, node]) => {
				if (!('$value' in node)) return [name, normalizeTokenGroup(node)]
				const { $type, $value, $description } = node as DesignToken
				return [name, { $type, $value, ...($description ? { $description } : {}) }]
			})
		)
	)

/** A file's token sets by name and its themes. */
export type FileTokens = {
	tokens: Record<string, DesignTokenGroup>
	tokenThemes: TokenTheme[]
}

/** The token catalog and themes of a file's tokens lib; none for a file without one. */
export const readTokens = (
	tokensLib: Record<string, unknown> | null | undefined,
	where: string
): FileTokens => {
	if (!tokensLib) return { tokens: {}, tokenThemes: [] }
	for (const key of Object.keys(tokensLib))
		if (key.startsWith('$') && !TOKENS_LIB_META_KEYS.has(key))
			throw shapeChanged(where, `an unknown key \`${key}\` beside the token sets`)
	const tokenThemes: TokenTheme[] = parse(
		z.array(rawThemeSchema),
		tokensLib.$themes,
		`${where}.$themes`
	)
		.map(({ group, name, selectedTokenSets }) => ({
			group,
			name,
			sets: Object.keys(selectedTokenSets).sort(compareCodeUnits),
		}))
		.sort((a, b) => compareCodeUnits(a.group, b.group) || compareCodeUnits(a.name, b.name))
	const tokens = Object.fromEntries(
		Object.entries(tokensLib)
			.filter(([key]) => !TOKENS_LIB_META_KEYS.has(key))
			.map(([set, group]) => [
				set,
				normalizeTokenGroup(parse(designTokenGroupSchema, group, `${where}.${set}`)),
			])
	)
	return { tokens: sortKeys(tokens), tokenThemes }
}
