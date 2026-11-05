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
