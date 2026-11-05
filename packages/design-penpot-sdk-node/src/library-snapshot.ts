import { z } from '@brrritscold/core-js/zod'
import { compareCodeUnits } from '@brrritscold/design-core-js/code-manifest'
import {
	EXCEPTIONS_RECORD_KEY,
	EXCEPTIONS_RECORD_NAMESPACE,
} from '@brrritscold/design-core-js/component-link'
import {
	LIBRARY_SNAPSHOT_SCHEMA_VERSION,
	type LibraryComponent,
	type LibrarySnapshot,
	librarySnapshotSchema,
} from '@brrritscold/design-core-js/library-snapshot'

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

/** The layer types that are a compound component's part when they are not a copy. */
const PLAIN_PART_TYPES = new Set(['frame', 'group'])

// The raw `get-file` fields the normalizer reads, and nothing else: unknown keys pass, while a
// field it reads that is renamed, removed or retyped fails the parse.

const rawFileSchema = z.object({
	id: z.string(),
	data: z.object({
		// A file that never had a component has no `components` key at all.
		components: z.record(z.string(), z.unknown()).optional(),
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

const rawShapeSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	shapes: z.array(z.string()).optional(),
	componentId: z.string().optional(),
})

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

/**
 * Normalizes a raw `get-file` result into a library snapshot: the design system library's
 * main components keyed by Penpot component id, each with its path, name, variant properties,
 * parts by role and exceptions record, sorted so the same file always serializes the same.
 *
 * - `path` drops Penpot's spaced separator (`Components / Card` → `Components/Card`).
 * - `variantProperties` come from a variant's `variantProperties` list.
 * - `parts` are the direct children of the component's main instance that are a copy of a
 *   component (`componentId`) or a plain board or group (`componentId: null`, which fails drift
 *   rule 3); text and other leaf layers are content, not parts. The role is the child's name in
 *   the main component; two parts with one role throw.
 * - `exceptionsRecord` is the component's shared plugin data `brrritscold.core-react` / `link`,
 *   which JSON `get-file` delivers under the camel-cased key `brrritscoldCoreReact`.
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
 * // { schemaVersion: 1, penpotVersion: '2.18.6', libraryFileId: 'de716cff-…',
 * //   components: { '27d1f7d6-…': { path: 'Components', name: 'Button',
 * //     variantProperties: { size: 'sm' }, parts: {} }, … } }
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
		for (const childId of main.shapes ?? []) {
			const child = readPart(page.objects, childId, `${where} part`)
			if (child.componentId === undefined && !PLAIN_PART_TYPES.has(child.type)) continue
			if (child.name in parts)
				throw new Error(
					`Component ${raw.path} / ${raw.name} (${raw.id}) has two parts with the role \`${child.name}\``
				)
			parts[child.name] = { componentId: child.componentId ?? null }
		}

		if (raw.variantId !== undefined && raw.variantProperties === undefined)
			throw shapeChanged(where, 'a variant (`variantId`) without `variantProperties`')
		const variantProperties = Object.fromEntries(
			(raw.variantProperties ?? []).map(({ name, value }) => [name, value])
		)

		const exceptionsRecord = readExceptionsRecord(raw.pluginData, where)
		return {
			path: normalizePath(raw.path),
			name: raw.name,
			variantProperties: sortKeys(variantProperties),
			parts: sortKeys(parts),
			...(exceptionsRecord === undefined ? {} : { exceptionsRecord }),
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
 * // { schemaVersion: 1, penpotVersion: '2.18.6', libraryFileId: 'de716cff-…', components: {…} }
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
