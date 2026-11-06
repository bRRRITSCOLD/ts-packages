import { z } from '@brrritscold/core-js/zod'
import { compareCodeUnits } from '@brrritscold/design-core-js/code-manifest'
import {
	EXCEPTIONS_RECORD_KEY,
	EXCEPTIONS_RECORD_NAMESPACE,
} from '@brrritscold/design-core-js/component-link'
import {
	CHECKED_TOKEN_ATTRIBUTES,
	type CheckedTokenAttribute,
	LIBRARY_SNAPSHOT_SCHEMA_VERSION,
	type LibraryComponent,
	type LibraryLayer,
	type LibrarySnapshot,
	librarySnapshotSchema,
} from '@brrritscold/design-core-js/library-snapshot'
import {
	type DesignToken,
	type DesignTokenGroup,
	designTokenGroupSchema,
	type TokenTheme,
} from '@brrritscold/design-core-js/token-file'

import {
	type CreatePenpotRpcClientParameters,
	createPenpotRpcClient,
	PENPOT_VERSION,
} from './rpc.js'

/**
 * The plugin-data key the exceptions record's namespace arrives under in JSON `get-file`.
 * Penpot stores it as the keyword `:shared/brrritscold.core-react` and its JSON encoder
 * camel-cases keyword keys, dropping the `shared/` part: `brrritscoldCoreReact`.
 */
const PLUGIN_DATA_KEY = EXCEPTIONS_RECORD_NAMESPACE.replace(/[.-]+(.)/g, (_, next: string) =>
	next.toUpperCase()
)

/** Letters and digits only, lower-cased: how a re-encoded plugin-data key is still recognized. */
const bare = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '')

/** The layer types that are a layout wrapper when they are not a copy: parts are found through them. */
const WRAPPER_TYPES = new Set(['frame', 'group'])

// The raw `get-file` fields the normalizer reads, and nothing else: unknown keys pass, while a
// field it reads that is renamed, removed or retyped fails the parse.

const rawFileSchema = z.object({
	id: z.string(),
	data: z.object({
		// A file that never had a component has no `components` key at all.
		components: z.record(z.string(), z.unknown()).optional(),
		tokensLib: z.record(z.string(), z.unknown()).nullish(),
		pagesIndex: z.record(z.string(), z.object({ objects: z.record(z.string(), z.unknown()) })),
	}),
})

const rawComponentSchema = z.object({
	id: z.string(),
	name: z.string(),
	path: z.string(),
	mainInstanceId: z.string(),
	mainInstancePage: z.string(),
	deleted: z.boolean().optional(),
	variantId: z.string().optional(),
	variantProperties: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
	pluginData: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Every attribute Penpot 2.18.6 applies a token to (`app.common.types.token/all-keys`), as JSON
 * `get-file` camel-cases it. An applied token on any other key throws: Penpot changed shape.
 */
const PENPOT_TOKEN_ATTRIBUTES = [
	'x',
	'y',
	'r1',
	'r2',
	'r3',
	'r4',
	'fill',
	'strokeColor',
	'strokeWidth',
	'width',
	'height',
	'layoutItemMinW',
	'layoutItemMaxW',
	'layoutItemMinH',
	'layoutItemMaxH',
	'rowGap',
	'columnGap',
	'p1',
	'p2',
	'p3',
	'p4',
	'm1',
	'm2',
	'm3',
	'm4',
	'rotation',
	'lineHeight',
	'opacity',
	'shadow',
	'fontFamily',
	'fontSize',
	'fontWeight',
	'letterSpacing',
	'textCase',
	'textDecoration',
	'typography',
] as const

/** `strokeColor` → `stroke-color`: the token attribute's name in Penpot's own source. */
const kebab = (key: string) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

const CHECKED = new Set<string>(CHECKED_TOKEN_ATTRIBUTES)

/**
 * Penpot 2.18.6's text defaults (`app.common.types.text/default-text-attrs`): a font attribute
 * holding one of these is at its default, which the drift check never asks a token for.
 */
const TEXT_DEFAULTS = {
	fontFamily: 'sourcesanspro',
	fontSize: 14,
	fontWeight: '400',
	letterSpacing: 0,
}

/** One node of a text layer's content tree (root, paragraph set, paragraph or text leaf). */
type RawTextNode = {
	children?: RawTextNode[]
	fills?: unknown[] | null
	fontFamily?: string
	fontSize?: string | number
	fontWeight?: string | number
	letterSpacing?: string | number
}

const rawTextNodeSchema: z.ZodType<RawTextNode> = z.lazy(() =>
	z.object({
		children: z.array(rawTextNodeSchema).optional(),
		fills: z.array(z.unknown()).nullish(),
		fontFamily: z.string().optional(),
		fontSize: z.union([z.string(), z.number()]).optional(),
		fontWeight: z.union([z.string(), z.number()]).optional(),
		letterSpacing: z.union([z.string(), z.number()]).optional(),
	})
)

const rawShapeSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	shapes: z.array(z.string()).optional(),
	componentId: z.string().optional(),
	appliedTokens: z.partialRecord(z.enum(PENPOT_TOKEN_ATTRIBUTES), z.string()).nullish(),
	fills: z.array(z.unknown()).nullish(),
	strokes: z.array(z.unknown()).nullish(),
	shadow: z.array(z.unknown()).nullish(),
	opacity: z.number().nullish(),
	r1: z.number().nullish(),
	r2: z.number().nullish(),
	r3: z.number().nullish(),
	r4: z.number().nullish(),
	layout: z.enum(['flex', 'grid']).nullish(),
	layoutPadding: z
		.object({
			p1: z.number().nullish(),
			p2: z.number().nullish(),
			p3: z.number().nullish(),
			p4: z.number().nullish(),
		})
		.nullish(),
	layoutGap: z
		.object({ rowGap: z.number().nullish(), columnGap: z.number().nullish() })
		.nullish(),
	content: rawTextNodeSchema.nullish(),
})

type RawShape = z.infer<typeof rawShapeSchema>

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

const rawPluginDataSchema = z.object({ [EXCEPTIONS_RECORD_KEY]: z.string().optional() })

/** Thrown when `get-file` no longer has the shape the normalizer reads. */
const shapeChanged = (where: string, detail: string) =>
	new Error(
		`Penpot get-file changed shape at ${where} (this package reads Penpot ${PENPOT_VERSION}): ${detail}`
	)

const parse = <T>(schema: z.ZodType<T>, value: unknown, where: string): T => {
	const result = schema.safeParse(value)
	if (!result.success) throw shapeChanged(where, z.prettifyError(result.error))
	return result.data
}

/** `{ b: …, a: … }` → `{ a: …, b: … }`, so the snapshot serializes the same every time. */
const sortKeys = <V>(record: Record<string, V>): Record<string, V> =>
	Object.fromEntries(Object.entries(record).sort(([a], [b]) => compareCodeUnits(a, b)))

/** `Components / Card` → `Components/Card`: Penpot's display separator, not part of the path. */
const normalizePath = (path: string) =>
	path
		.split('/')
		.map((segment) => segment.trim())
		.filter(Boolean)
		.join('/')

/**
 * The exceptions record from a component's plugin data, parsed from JSON. A value that isn't
 * JSON is kept as the raw string, so drift rule 5 reports it instead of the refresh failing.
 */
const readExceptionsRecord = (
	pluginData: Record<string, unknown> | undefined,
	where: string
): unknown => {
	if (!pluginData) return undefined
	for (const key of Object.keys(pluginData))
		if (key !== PLUGIN_DATA_KEY && bare(key).endsWith(bare(EXCEPTIONS_RECORD_NAMESPACE)))
			throw shapeChanged(
				`${where}.pluginData`,
				`expected the plugin-data key \`${PLUGIN_DATA_KEY}\`, found \`${key}\``
			)
	const ours = pluginData[PLUGIN_DATA_KEY]
	if (ours === undefined) return undefined
	const raw = parse(rawPluginDataSchema, ours, `${where}.pluginData.${PLUGIN_DATA_KEY}`)[
		EXCEPTIONS_RECORD_KEY
	]
	if (raw === undefined) return undefined
	try {
		return JSON.parse(raw)
	} catch {
		return raw
	}
}

/** Every node of a text layer's content tree, the root included. */
const textNodes = (node: RawTextNode | null | undefined): RawTextNode[] =>
	node ? [node, ...(node.children ?? []).flatMap(textNodes)] : []

const isNonZero = (value: number | null | undefined) => (value ?? 0) !== 0

/**
 * The checked attributes a layer sets to a non-default value: a fill, stroke or shadow at all;
 * a radius, padding or gap other than 0 (padding and gap only on a flex or grid board);
 * opacity other than 1; a text font family, size, weight or letter spacing other than
 * Penpot's text default, on any node of its content.
 */
const nonDefaultAttributes = (shape: RawShape): Set<CheckedTokenAttribute> => {
	const nodes = textNodes(shape.content)
	const someNode = (differs: (node: RawTextNode) => boolean) => nodes.some(differs)
	const padding = shape.layout ? shape.layoutPadding : undefined
	const gap = shape.layout ? shape.layoutGap : undefined
	const isSet: Record<CheckedTokenAttribute, boolean> = {
		fill: Boolean(shape.fills?.length) || someNode((node) => Boolean(node.fills?.length)),
		'stroke-color': Boolean(shape.strokes?.length),
		r1: isNonZero(shape.r1),
		r2: isNonZero(shape.r2),
		r3: isNonZero(shape.r3),
		r4: isNonZero(shape.r4),
		p1: isNonZero(padding?.p1),
		p2: isNonZero(padding?.p2),
		p3: isNonZero(padding?.p3),
		p4: isNonZero(padding?.p4),
		'row-gap': isNonZero(gap?.rowGap),
		'column-gap': isNonZero(gap?.columnGap),
		'font-family': someNode(
			({ fontFamily }) => fontFamily !== undefined && fontFamily !== TEXT_DEFAULTS.fontFamily
		),
		'font-size': someNode(
			({ fontSize }) => fontSize !== undefined && Number(fontSize) !== TEXT_DEFAULTS.fontSize
		),
		'font-weight': someNode(
			({ fontWeight }) =>
				fontWeight !== undefined && String(fontWeight) !== TEXT_DEFAULTS.fontWeight
		),
		'letter-spacing': someNode(
			({ letterSpacing }) =>
				letterSpacing !== undefined && Number(letterSpacing) !== TEXT_DEFAULTS.letterSpacing
		),
		shadow: Boolean(shape.shadow?.length),
		opacity: (shape.opacity ?? 1) !== 1,
	}
	return new Set(CHECKED_TOKEN_ATTRIBUTES.filter((attribute) => isSet[attribute]))
}

/**
 * A layer's applied tokens and unbound attributes, the checked attributes only; `undefined`
 * for a layer with neither.
 */
const readLayer = (shape: RawShape, namePath: string[]): LibraryLayer | undefined => {
	const applied = new Map(
		Object.entries(shape.appliedTokens ?? {})
			.map(([attribute, token]) => [kebab(attribute), token] as const)
			.filter(([attribute]) => CHECKED.has(attribute))
	)
	const appliedTokens: LibraryLayer['appliedTokens'] = {}
	for (const attribute of CHECKED_TOKEN_ATTRIBUTES) {
		const token = applied.get(attribute)
		if (token !== undefined) appliedTokens[attribute] = token
	}
	const unbound = [...nonDefaultAttributes(shape)].filter((attribute) => !applied.has(attribute))
	return applied.size || unbound.length ? { namePath, appliedTokens, unbound } : undefined
}

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

/** The token catalog and themes of a file's tokens lib; none for a file without one. */
const readTokens = (
	tokensLib: Record<string, unknown> | null | undefined,
	where: string
): Pick<LibrarySnapshot, 'tokens' | 'tokenThemes'> => {
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

/**
 * Normalizes a raw `get-file` result into a library snapshot: the design system library's
 * token catalog and themes, and its main components keyed by Penpot component id, each with
 * its path, name, variant properties, parts by role, exceptions record and layers, sorted so
 * the same file always serializes the same.
 *
 * - `tokens` is `data.tokensLib` (Penpot's own DTCG export) without `$themes` / `$metadata`:
 *   the sets by name in the shape of `tokens.json`, groups sorted, empty `$description`
 *   dropped. `tokenThemes` are its `$themes` as `{ group, name, sets }`.
 * - `path` drops Penpot's spaced separator (`Components / Card` → `Components/Card`).
 * - `variantProperties` come from a variant's `variantProperties` list.
 * - `parts` are the copies of a component (`componentId`) among the main instance's children,
 *   looking through plain boards and groups at any depth; the search stops at a copy. Text and
 *   other leaf layers are content, not parts. The role is the copy's name in the main component;
 *   two parts with one role throw, naming the component.
 * - `wrappers` are the names of those plain boards and groups (layout wrappers), sorted. A
 *   wrapper is never a part, but its styling is still in `layers`.
 * - `exceptionsRecord` is the component's shared plugin data `brrritscold.core-react` / `link`,
 *   which JSON `get-file` delivers under the camel-cased key `brrritscoldCoreReact`.
 * - `layers` are the layers of the main instance's tree, nested part copies included, that
 *   carry a token on a checked attribute (`CHECKED_TOKEN_ATTRIBUTES`) or set one to a
 *   non-default value without a token (`unbound`), with their name path.
 * - deleted components are left out.
 *
 * Only the fields read are validated, strictly: a renamed, removed or retyped field throws an
 * error naming where, instead of producing a wrong snapshot. The result is validated against
 * design-core-js's library-snapshot schema.
 *
 * @example
 * ```ts
 * // CJS
 * const { normalizeLibrarySnapshot } = require('@brrritscold/design-penpot-sdk-node/library-snapshot')
 * // ESM
 * import { normalizeLibrarySnapshot } from '@brrritscold/design-penpot-sdk-node/library-snapshot'
 *
 * normalizeLibrarySnapshot(await penpot.getFile(libraryFileId))
 * // { schemaVersion: 3, penpotVersion: '2.18.6', libraryFileId: 'de716cff-…',
 * //   tokens: { dark: {…}, light: {…}, primitive: {…} },
 * //   tokenThemes: [{ group: 'Mode', name: 'Dark', sets: ['dark', 'primitive'] }, …],
 * //   components: { '27d1f7d6-…': { path: 'Components', name: 'Button',
 * //     variantProperties: { size: 'sm' }, parts: {}, wrappers: [],
 * //     layers: { '9b0c…': { namePath: ['Button'], appliedTokens: { fill: 'primary' }, unbound: [] } } }, … } }
 * ```
 */
export const normalizeLibrarySnapshot = (getFile: unknown): LibrarySnapshot => {
	const file = parse(rawFileSchema, getFile, 'get-file')

	const readPart = (objects: Record<string, unknown>, shapeId: string, where: string) => {
		if (!(shapeId in objects)) throw shapeChanged(where, `no layer ${shapeId} on its page`)
		return parse(rawShapeSchema, objects[shapeId], `${where}.objects.${shapeId}`)
	}

	const normalize = (
		raw: z.infer<typeof rawComponentSchema>,
		where: string
	): LibraryComponent => {
		const page = file.data.pagesIndex[raw.mainInstancePage]
		if (!page) throw shapeChanged(where, `main instance page ${raw.mainInstancePage} not found`)
		const main = readPart(page.objects, raw.mainInstanceId, `${where} main instance`)

		const parts: LibraryComponent['parts'] = {}
		const wrappers = new Set<string>()
		const findParts = (shape: RawShape) => {
			for (const childId of shape.shapes ?? []) {
				const child = readPart(page.objects, childId, `${where} part`)
				if (child.componentId === undefined) {
					if (!WRAPPER_TYPES.has(child.type)) continue
					wrappers.add(child.name)
					findParts(child)
					continue
				}
				if (child.name in parts)
					throw new Error(
						`Component ${raw.path} / ${raw.name} (${raw.id}) has two parts with the role \`${child.name}\``
					)
				parts[child.name] = { componentId: child.componentId }
			}
		}
		findParts(main)

		if (raw.variantId !== undefined && raw.variantProperties === undefined)
			throw shapeChanged(where, 'a variant (`variantId`) without `variantProperties`')
		const variantProperties = Object.fromEntries(
			(raw.variantProperties ?? []).map(({ name, value }) => [name, value])
		)

		const layers: LibraryComponent['layers'] = {}
		const visit = (shape: RawShape, parentPath: string[]) => {
			const namePath = [...parentPath, shape.name]
			const layer = readLayer(shape, namePath)
			if (layer) layers[shape.id] = layer
			for (const childId of shape.shapes ?? [])
				visit(readPart(page.objects, childId, `${where} layer`), namePath)
		}
		visit(main, [])

		const exceptionsRecord = readExceptionsRecord(raw.pluginData, where)
		return {
			path: normalizePath(raw.path),
			name: raw.name,
			variantProperties: sortKeys(variantProperties),
			parts: sortKeys(parts),
			wrappers: [...wrappers].sort(compareCodeUnits),
			...(exceptionsRecord === undefined ? {} : { exceptionsRecord }),
			layers: sortKeys(layers),
		}
	}

	const components = Object.entries(file.data.components ?? {})
		.map(([key, value]) => {
			const where = `data.components.${key}`
			return [where, parse(rawComponentSchema, value, where)] as const
		})
		.filter(([, raw]) => !raw.deleted)
		.sort(([, a], [, b]) => compareCodeUnits(a.id, b.id))
		.map(([where, raw]) => [raw.id, normalize(raw, where)] as const)

	return librarySnapshotSchema.parse({
		schemaVersion: LIBRARY_SNAPSHOT_SCHEMA_VERSION,
		penpotVersion: PENPOT_VERSION,
		libraryFileId: file.id,
		...readTokens(file.data.tokensLib, 'get-file.data.tokensLib'),
		components: Object.fromEntries(components),
	})
}

/** What {@link readLibrarySnapshot} needs: the client parameters and the library file's id. */
export type ReadLibrarySnapshotParameters = CreatePenpotRpcClientParameters & {
	/** The design system library file's id. */
	fileId: string
}

/**
 * Reads a library file from Penpot and returns its library snapshot: checks the server runs
 * the pinned Penpot version (throwing if not), calls `get-file` without `features`, and
 * normalizes the result with {@link normalizeLibrarySnapshot}.
 *
 * @example
 * ```ts
 * // CJS
 * const { readLibrarySnapshot } = require('@brrritscold/design-penpot-sdk-node/library-snapshot')
 * // ESM
 * import { readLibrarySnapshot } from '@brrritscold/design-penpot-sdk-node/library-snapshot'
 *
 * const snapshot = await readLibrarySnapshot({
 * 	baseUrl: 'https://penpot.example',
 * 	accessToken: process.env.SNAPSHOT_REFRESH_PENPOT_TOKEN,
 * 	fileId: 'de716cff-f170-81a2-8008-e63b04772bf6',
 * })
 * // { schemaVersion: 3, penpotVersion: '2.18.6', libraryFileId: 'de716cff-…', tokens: {…}, tokenThemes: […], components: {…} }
 * ```
 */
export const readLibrarySnapshot = async ({
	fileId,
	...clientParameters
}: ReadLibrarySnapshotParameters): Promise<LibrarySnapshot> => {
	const penpot = createPenpotRpcClient(clientParameters)
	await penpot.assertVersion()
	return normalizeLibrarySnapshot(await penpot.getFile(fileId))
}
