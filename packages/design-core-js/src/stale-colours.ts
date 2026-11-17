import { type DesignTokenGroup, flattenTokens, type TokenTheme } from './token-file.js'

/** A plain colour: `#rrggbb` in lower case and an opacity from 0 to 1. */
export type Colour = { hex: string; opacity: number }

const byte = (value: string): number | undefined => {
	const number = Number(value)
	return Number.isInteger(number) && number >= 0 && number <= 255 ? number : undefined
}

const toHex = (channels: number[]) =>
	`#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`

/**
 * Reads a plain colour value the way Penpot stores a fill or stroke: `#rgb`, `#rrggbb`,
 * `#rrggbbaa` (the alpha becomes the opacity), `rgb(r, g, b)`, `rgba(r, g, b, a)` and
 * `transparent` (black at no opacity). Anything else, a `{reference}` or a dimension included,
 * is not a plain colour: `undefined`.
 *
 * @example
 * ```ts
 * // CJS
 * const { parseColour } = require('@brrritscold/design-core-js/stale-colours')
 * // ESM
 * import { parseColour } from '@brrritscold/design-core-js/stale-colours'
 *
 * parseColour('rgba(96, 165, 250, 0.2)') // { hex: '#60a5fa', opacity: 0.2 }
 * parseColour('#FAFAFA') // { hex: '#fafafa', opacity: 1 }
 * parseColour('{color.white}') // undefined
 * ```
 */
export const parseColour = (value: unknown): Colour | undefined => {
	if (typeof value !== 'string') return undefined
	const text = value.trim().toLowerCase()
	if (text === 'transparent') return { hex: '#000000', opacity: 0 }

	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text)?.[1]
	if (hex) {
		const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex
		const alpha = full.length === 8 ? Number.parseInt(full.slice(6), 16) / 255 : 1
		return { hex: `#${full.slice(0, 6)}`, opacity: Math.round(alpha * 1000) / 1000 }
	}

	const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(text)
	if (!rgb) return undefined
	const channels = rgb.slice(1, 4).map(byte)
	const opacity = rgb[4] === undefined ? 1 : Number(rgb[4])
	if (channels.some((channel) => channel === undefined) || !(opacity >= 0 && opacity <= 1))
		return undefined
	return { hex: toHex(channels as number[]), opacity }
}

const REFERENCE = /^\{([^{}]+)\}$/

/**
 * Resolves every token of a file's active sets to a plain colour, by full token name, as Penpot
 * resolves them: the active sets merged in order (a later set's token wins over an earlier
 * one's), then `{references}` followed through that merged catalog. A token that isn't a plain
 * colour once resolved (a dimension, a shadow), or whose references dangle or loop, is left out.
 *
 * @example
 * ```ts
 * // CJS
 * const { resolveColourTokens } = require('@brrritscold/design-core-js/stale-colours')
 * // ESM
 * import { resolveColourTokens } from '@brrritscold/design-core-js/stale-colours'
 *
 * resolveColourTokens(
 * 	{ primitive: { color: { neutral: { 50: { $type: 'color', $value: '#fafafa' } } } },
 * 	  dark: { foreground: { $type: 'color', $value: '{color.neutral.50}' } } },
 * 	['primitive', 'dark']
 * )
 * // { 'color.neutral.50': { hex: '#fafafa', opacity: 1 }, foreground: { hex: '#fafafa', opacity: 1 } }
 * ```
 */
export const resolveColourTokens = (
	tokens: Record<string, DesignTokenGroup>,
	activeSets: readonly string[]
): Record<string, Colour> => {
	const merged = new Map<string, unknown>()
	for (const set of activeSets)
		for (const [name, token] of Object.entries(flattenTokens(tokens[set] ?? {})))
			merged.set(name, token.$value)

	const resolve = (value: unknown, seen: Set<string>): unknown => {
		const name = typeof value === 'string' ? REFERENCE.exec(value.trim())?.[1] : undefined
		if (name === undefined) return value
		if (seen.has(name) || !merged.has(name)) return undefined
		return resolve(merged.get(name), new Set([...seen, name]))
	}

	const colours: Record<string, Colour> = {}
	for (const [name, value] of merged) {
		const colour = parseColour(resolve(value, new Set([name])))
		if (colour) colours[name] = colour
	}
	return colours
}

/**
 * One layer of a page design file applying a token to its fill or stroke colour, with the
 * colours it stores: a shape's first fill or stroke, or a text's fill on every text run.
 */
export type TokenColourLayer = {
	/** The page's name. */
	page: string
	/** The name of the layer's top-level board on the page (the layer itself when it is one). */
	board: string
	/** The layer's id. */
	layerId: string
	/** The layer's name. */
	layerName: string
	/** Whether the layer is inside a component copy (a library copy, in a page design). */
	copy: boolean
	/** The attribute the token is applied to. */
	attribute: 'fill' | 'stroke-color'
	/** The applied token's full name. */
	token: string
	/** The colours the layer stores for that attribute; empty when it stores none. */
	colours: Colour[]
}

/**
 * A page design file normalized for {@link findStaleColours}: its token catalog, active themes
 * and sets, and every layer applying a token to a fill or stroke colour.
 */
export type PageDesignColours = {
	/** The file's id. */
	fileId: string
	/** The file's name. */
	fileName: string
	/** The active themes, as `<group>/<name>` (`Mode/Dark`). */
	activeThemes: string[]
	/** The active token sets in precedence order: a later set's token wins. */
	activeSets: string[]
	/** The file's token themes. */
	tokenThemes: TokenTheme[]
	/** The file's token sets by name, each a DTCG tree. */
	tokens: Record<string, DesignTokenGroup>
	/** Every layer applying a token to a fill or stroke colour. */
	layers: TokenColourLayer[]
}

/** A layer whose stored colour differs from its token's value in the active theme. */
export type StaleColour = Omit<TokenColourLayer, 'colours'> & {
	/** The token's value in the active sets. */
	expected: Colour
	/** The first stored colour that differs from it. */
	found: Colour
}

/** What {@link findStaleColours} found in a file. */
export type StaleColourReport = {
	fileId: string
	fileName: string
	activeThemes: string[]
	/**
	 * The theme toggle that makes Penpot re-resolve every applied token: switch the `group` to
	 * `other` and back to `active`. `undefined` when no theme is active or its group has no other.
	 */
	fixTheme: { group: string; active: string; other: string } | undefined
	/** How many layers apply a token that resolves to a plain colour. */
	checked: number
	/** The layers storing another colour, in the order they came. */
	stale: StaleColour[]
}

/** Opacity is stored as a float; closer than this is the same opacity. */
const OPACITY_TOLERANCE = 0.005

const sameColour = (a: Colour, b: Colour) =>
	a.hex.toLowerCase() === b.hex.toLowerCase() &&
	Math.abs(a.opacity - b.opacity) < OPACITY_TOLERANCE

const findFixTheme = ({
	activeThemes,
	tokenThemes,
}: PageDesignColours): StaleColourReport['fixTheme'] => {
	for (const active of tokenThemes) {
		if (!activeThemes.includes(`${active.group}/${active.name}`)) continue
		const other = tokenThemes.find(
			(theme) => theme.group === active.group && theme.name !== active.name
		)
		if (other) return { group: active.group, active: active.name, other: other.name }
	}
	return undefined
}

/**
 * Finds the layers of a page design file whose stored fill or stroke colour differs from their
 * applied token's value in the file's active sets: **stale colours**. Penpot can leave them
 * when a library copy in a Dark page design re-syncs with (or is swapped to) a library main
 * that stores its Light values. The token names stay right; only the stored colour is wrong, and
 * toggling the file's theme to `fixTheme.other` and back makes Penpot re-resolve them.
 *
 * A layer is checked when its token resolves to a plain colour ({@link resolveColourTokens}),
 * copies and page-local layers alike; colour and opacity both count, so an rgba token's
 * opacity is compared too. A token that isn't a colour, or isn't in the catalog, is skipped.
 *
 * @example
 * ```ts
 * // CJS
 * const { findStaleColours } = require('@brrritscold/design-core-js/stale-colours')
 * // ESM
 * import { findStaleColours } from '@brrritscold/design-core-js/stale-colours'
 *
 * findStaleColours(pageDesignColours) // from design-penpot-sdk-node's normalizer
 * // { fileName: 'agentdeck', activeThemes: ['Mode/Dark'],
 * //   fixTheme: { group: 'Mode', active: 'Dark', other: 'Light' }, checked: 25012,
 * //   stale: [{ page: 'Sessions', board: 'Session list', token: 'foreground', attribute: 'fill',
 * //     expected: { hex: '#fafafa', opacity: 1 }, found: { hex: '#0a0a0a', opacity: 1 }, … }] }
 * ```
 */
export const findStaleColours = (file: PageDesignColours): StaleColourReport => {
	const expectedColours = resolveColourTokens(file.tokens, file.activeSets)
	let checked = 0
	const stale: StaleColour[] = []
	for (const { colours, ...layer } of file.layers) {
		const expected = expectedColours[layer.token]
		if (!expected || colours.length === 0) continue
		checked += 1
		const found = colours.find((colour) => !sameColour(colour, expected))
		if (found) stale.push({ ...layer, expected, found })
	}
	return {
		fileId: file.fileId,
		fileName: file.fileName,
		activeThemes: file.activeThemes,
		fixTheme: findFixTheme(file),
		checked,
		stale,
	}
}
