import { z } from '@brrritscold/core-js/zod'

/**
 * One W3C DTCG design token: its type, its value (a literal or a `{reference}`; shadows are
 * objects or arrays of them) and an optional description.
 */
export const designTokenSchema = z.strictObject({
	$type: z.string(),
	$value: z.unknown(),
	$description: z.string().optional(),
})

/** One W3C DTCG design token; see {@link designTokenSchema}. */
export type DesignToken = z.infer<typeof designTokenSchema>

/** A DTCG group: tokens and nested groups by name. A name never starts with `$`. */
export type DesignTokenGroup = { [name: string]: DesignToken | DesignTokenGroup }

/**
 * A DTCG group: tokens and nested groups by name, `{ color: { white: { $type, $value } } }`.
 * The token's full name is its path joined with dots, `color.white`.
 */
export const designTokenGroupSchema: z.ZodType<DesignTokenGroup> = z.lazy(() =>
	z.record(
		z.string().regex(/^[^$]/, 'a token or group name never starts with `$`'),
		z.union([designTokenSchema, designTokenGroupSchema])
	)
)

/**
 * The token file, `packages/core-react/tokens/tokens.json`: one DTCG tree with the sets
 * `primitive`, `light` and `dark`, and no `$themes` or `$metadata`.
 */
export const tokenFileSchema = z.strictObject({
	primitive: designTokenGroupSchema,
	light: designTokenGroupSchema,
	dark: designTokenGroupSchema,
})

/** The token file; see {@link tokenFileSchema}. */
export type TokenFile = z.infer<typeof tokenFileSchema>

/**
 * A Penpot token theme: its group and name, and the sets it enables (sorted). The library
 * snapshot records them, since the token file itself carries no `$themes`.
 */
export const tokenThemeSchema = z.strictObject({
	group: z.string(),
	name: z.string(),
	sets: z.array(z.string()),
})

/** A Penpot token theme; see {@link tokenThemeSchema}. */
export type TokenTheme = z.infer<typeof tokenThemeSchema>

/**
 * The themes token sync writes beside the token file's sets: the group `Mode` with `Light`
 * (`primitive` + `light`) and `Dark` (`primitive` + `dark`).
 */
export const TOKEN_THEMES: readonly TokenTheme[] = [
	{ group: 'Mode', name: 'Dark', sets: ['dark', 'primitive'] },
	{ group: 'Mode', name: 'Light', sets: ['light', 'primitive'] },
]

const isDesignToken = (node: DesignToken | DesignTokenGroup): node is DesignToken =>
	'$value' in node

/**
 * Flattens a DTCG group into its tokens by full name: `{ color: { white: {…} } }` →
 * `{ 'color.white': {…} }`, the name Penpot applies a token by.
 */
export const flattenTokens = (group: DesignTokenGroup, prefix = ''): Record<string, DesignToken> =>
	Object.fromEntries(
		Object.entries(group).flatMap(([name, node]) => {
			const fullName = prefix ? `${prefix}.${name}` : name
			return isDesignToken(node)
				? [[fullName, node]]
				: Object.entries(flattenTokens(node, fullName))
		})
	)

/**
 * Whether two tokens are equal: type, description and value, the value compared in one form
 * whichever side wrote it. Penpot's plugin API stores numbers as strings, font families as a
 * list and every shadow as a list of layers with `inset`, where tokens.json keeps a number, a
 * comma-separated string and a bare object; object keys compare in any order.
 *
 * Drift rule 6 and the token sync script share this one function, so they can't disagree. It
 * references nothing outside its own body, because token sync embeds its source text in the
 * script it generates.
 */
export const sameToken = (a: DesignToken, b: DesignToken): boolean => {
	if (a.$type !== b.$type || (a.$description ?? '') !== (b.$description ?? '')) return false
	const [first, second] = [a, b].map(({ $type, $value }) =>
		JSON.stringify(
			$type === 'fontFamilies'
				? (Array.isArray($value) ? $value : String($value).split(',')).map((family) =>
						String(family).trim()
					)
				: $type === 'shadow'
					? (Array.isArray($value) ? $value : [$value]).map((layer) => ({
							inset: false,
							...(layer as object),
						}))
					: typeof $value === 'number'
						? String($value)
						: $value,
			(_, nested) =>
				nested && typeof nested === 'object' && !Array.isArray(nested)
					? Object.fromEntries(
							Object.entries(nested).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
						)
					: nested
		)
	)
	return first === second
}
