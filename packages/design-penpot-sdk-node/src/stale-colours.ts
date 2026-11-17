import { parseArgs } from 'node:util'

import { z } from '@brrritscold/core-js/zod'
import {
	type Colour,
	findStaleColours,
	type PageDesignColours,
	parseColour,
	type StaleColour,
	type StaleColourReport,
	type TokenColourLayer,
} from '@brrritscold/design-core-js/stale-colours'

import { parse, ROOT_FRAME_ID, readTokens, shapeChanged } from './lib/penpot-file.js'
import { type CreatePenpotRpcClientParameters, createPenpotRpcClient } from './rpc.js'

// The raw `get-file` fields this normalizer reads, and nothing else: unknown keys pass, while a
// field it reads that is renamed, removed or retyped fails the parse.

const rawFileSchema = z.object({
	id: z.string(),
	name: z.string(),
	data: z.object({
		tokensLib: z.record(z.string(), z.unknown()).nullish(),
		pagesIndex: z.record(
			z.string(),
			z.object({ name: z.string(), objects: z.record(z.string(), z.unknown()) })
		),
	}),
})

/** `$metadata`: the set order (a later set wins) and what is active. */
const rawMetadataSchema = z.object({
	tokenSetOrder: z.array(z.string()),
	activeThemes: z.array(z.string()),
	activeSets: z.array(z.string()),
})

/** What a board lookup reads of any layer. */
const rawAncestorSchema = z.object({ name: z.string(), parentId: z.string().nullish() })

const rawFillSchema = z.object({
	fillColor: z.string().optional(),
	fillOpacity: z.number().nullish(),
})

const rawStrokeSchema = z.object({
	strokeColor: z.string().optional(),
	strokeOpacity: z.number().nullish(),
})

/** One node of a text layer's content tree; a node with `text` is a run, the one drawn. */
type RawTextNode = {
	text?: string
	fills?: z.infer<typeof rawFillSchema>[] | null
	children?: RawTextNode[]
}

const rawTextNodeSchema: z.ZodType<RawTextNode> = z.lazy(() =>
	z.object({
		text: z.string().optional(),
		fills: z.array(rawFillSchema).nullish(),
		children: z.array(rawTextNodeSchema).optional(),
	})
)

const rawShapeSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	parentId: z.string().nullish(),
	shapeRef: z.string().nullish(),
	appliedTokens: z.record(z.string(), z.string()).nullish(),
	fills: z.array(rawFillSchema).nullish(),
	strokes: z.array(rawStrokeSchema).nullish(),
	content: z.unknown().optional(),
})

/** The token attributes this check reads, as JSON `get-file` camel-cases them. */
const COLOUR_ATTRIBUTES = { fill: 'fill', strokeColor: 'stroke-color' } as const

/** A stored colour and opacity as a {@link Colour}; `undefined` for no colour (a gradient, an image). */
const storedColour = (
	colour: string | undefined,
	opacity: number | null | undefined
): Colour | undefined => {
	const parsed = parseColour(colour)
	return parsed && { hex: parsed.hex, opacity: opacity ?? 1 }
}

const textRuns = (node: RawTextNode | null | undefined): RawTextNode[] =>
	node
		? [...(node.text === undefined ? [] : [node]), ...(node.children ?? []).flatMap(textRuns)]
		: []

const present = <T>(value: T | undefined): value is T => value !== undefined

/**
 * Normalizes a raw `get-file` result of a page design file (or the library) for
 * `findStaleColours` (`@brrritscold/design-core-js/stale-colours`): its token catalog and
 * themes, its active themes and sets, and every layer applying a token to a fill or stroke
 * colour, with the colours it stores.
 *
 * - `activeSets` are `$metadata.activeSets` in `$metadata.tokenSetOrder`, so a later set wins.
 * - A layer's `board` is its top-level ancestor on the page (a child of the root frame), itself
 *   when it is one; `copy` is whether it is inside a component copy (it has a `shapeRef`).
 * - The stored colours are the first fill or stroke of a shape, and the first fill of every text
 *   run of a text, whose own `fills` Penpot leaves empty. A fill with no plain colour (a
 *   gradient, an image) stores none.
 *
 * Only the fields read are validated, strictly: a renamed, removed or retyped field throws an
 * error naming where.
 *
 * @example
 * ```ts
 * // CJS
 * const { normalizePageDesignColours } = require('@brrritscold/design-penpot-sdk-node/stale-colours')
 * // ESM
 * import { normalizePageDesignColours } from '@brrritscold/design-penpot-sdk-node/stale-colours'
 *
 * normalizePageDesignColours(await penpot.getFile(fileId))
 * // { fileId: 'd42f0aaa-…', fileName: 'agentdeck', activeThemes: ['Mode/Dark'],
 * //   activeSets: ['primitive', 'dark'], tokenThemes: […], tokens: {…},
 * //   layers: [{ page: 'Sessions', board: 'Session list', layerId: '…', layerName: 'Title',
 * //     copy: true, attribute: 'fill', token: 'foreground', colours: [{ hex: '#fafafa', opacity: 1 }] }, …] }
 * ```
 */
export const normalizePageDesignColours = (getFile: unknown): PageDesignColours => {
	const file = parse(rawFileSchema, getFile, 'get-file')
	const tokensLib = file.data.tokensLib
	const where = 'get-file.data.tokensLib'
	const metadata = tokensLib
		? parse(rawMetadataSchema, tokensLib.$metadata, `${where}.$metadata`)
		: { tokenSetOrder: [], activeThemes: [], activeSets: [] }
	const ordered = metadata.tokenSetOrder.filter((set) => metadata.activeSets.includes(set))
	const activeSets = [...ordered, ...metadata.activeSets.filter((set) => !ordered.includes(set))]

	const layers: TokenColourLayer[] = []
	for (const [pageId, page] of Object.entries(file.data.pagesIndex)) {
		const pageWhere = `get-file.data.pagesIndex.${pageId}.objects`
		const boards = new Map<string, string>()
		const boardOf = (shapeId: string): string => {
			const cached = boards.get(shapeId)
			if (cached !== undefined) return cached
			const shape = parse(rawAncestorSchema, page.objects[shapeId], `${pageWhere}.${shapeId}`)
			const parentId = shape.parentId ?? ROOT_FRAME_ID
			if (parentId !== ROOT_FRAME_ID && !(parentId in page.objects))
				throw shapeChanged(`${pageWhere}.${shapeId}`, `no parent ${parentId} on its page`)
			const board = parentId === ROOT_FRAME_ID ? shape.name : boardOf(parentId)
			boards.set(shapeId, board)
			return board
		}

		for (const [shapeId, value] of Object.entries(page.objects)) {
			const applied = (value as { appliedTokens?: Record<string, unknown> } | null)
				?.appliedTokens
			if (!applied || !Object.keys(COLOUR_ATTRIBUTES).some((key) => key in applied)) continue
			const shape = parse(rawShapeSchema, value, `${pageWhere}.${shapeId}`)
			const text =
				shape.type === 'text'
					? parse(
							rawTextNodeSchema.nullish(),
							shape.content,
							`${pageWhere}.${shapeId}.content`
						)
					: undefined
			for (const [key, attribute] of Object.entries(COLOUR_ATTRIBUTES)) {
				const token = shape.appliedTokens?.[key]
				if (token === undefined) continue
				const colours =
					attribute === 'stroke-color'
						? [shape.strokes?.[0]].map(
								(stroke) =>
									stroke && storedColour(stroke.strokeColor, stroke.strokeOpacity)
							)
						: shape.type === 'text'
							? textRuns(text).map(({ fills }) => {
									const fill = fills?.[0]
									return fill && storedColour(fill.fillColor, fill.fillOpacity)
								})
							: [shape.fills?.[0]].map(
									(fill) => fill && storedColour(fill.fillColor, fill.fillOpacity)
								)
				layers.push({
					page: page.name,
					board: boardOf(shapeId),
					layerId: shape.id,
					layerName: shape.name,
					copy: Boolean(shape.shapeRef),
					attribute,
					token,
					colours: colours.filter(present),
				})
			}
		}
	}

	return {
		fileId: file.id,
		fileName: file.name,
		activeThemes: metadata.activeThemes,
		activeSets,
		...readTokens(tokensLib, where),
		layers,
	}
}

/** What {@link readPageDesignColours} needs: the client parameters and the file's id. */
export type ReadPageDesignColoursParameters = CreatePenpotRpcClientParameters & {
	/** The page design (or library) file's id. */
	fileId: string
}

/**
 * Reads a file from Penpot for `findStaleColours`: checks the server runs the pinned Penpot
 * version (throwing if not), calls `get-file` without `features`, and normalizes the result with
 * {@link normalizePageDesignColours}.
 *
 * @example
 * ```ts
 * // CJS
 * const { readPageDesignColours } = require('@brrritscold/design-penpot-sdk-node/stale-colours')
 * // ESM
 * import { readPageDesignColours } from '@brrritscold/design-penpot-sdk-node/stale-colours'
 * import { findStaleColours } from '@brrritscold/design-core-js/stale-colours'
 *
 * const colours = await readPageDesignColours({
 * 	baseUrl: 'https://penpot.example',
 * 	accessToken: process.env.SNAPSHOT_REFRESH_PENPOT_TOKEN,
 * 	fileId: 'd42f0aaa-d103-81b9-8008-eeaaa3285c56',
 * })
 * findStaleColours(colours).stale // []
 * ```
 */
export const readPageDesignColours = async ({
	fileId,
	...clientParameters
}: ReadPageDesignColoursParameters): Promise<PageDesignColours> => {
	const penpot = createPenpotRpcClient(clientParameters)
	await penpot.assertVersion()
	return normalizePageDesignColours(await penpot.getFile(fileId))
}

/**
 * The line that tells the user how to fix stale colours: toggle the file's theme to the other
 * theme of its group and back, which makes Penpot re-resolve every applied token.
 *
 * @example
 * ```ts
 * // CJS
 * const { staleColoursFix } = require('@brrritscold/design-penpot-sdk-node/stale-colours')
 * // ESM
 * import { staleColoursFix } from '@brrritscold/design-penpot-sdk-node/stale-colours'
 *
 * staleColoursFix({ group: 'Mode', active: 'Dark', other: 'Light' })
 * // "Toggle the file's Mode theme to Light and back to Dark in Penpot (Tokens → Themes); then re-run."
 * ```
 */
export const staleColoursFix = (fixTheme: StaleColourReport['fixTheme']): string =>
	fixTheme
		? `Toggle the file's ${fixTheme.group} theme to ${fixTheme.other} and back to ${fixTheme.active} in Penpot (Tokens → Themes); then re-run.`
		: "Toggle the file's active theme off and back on in Penpot (Tokens → Themes); then re-run."

const formatColour = ({ hex, opacity }: Colour) =>
	opacity === 1 ? hex : `${hex} at ${opacity} opacity`

const countDescending = <T extends { name: string; count: number }>(a: T, b: T) =>
	b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)

/**
 * Formats a stale-colour report as lines for the terminal: a header with the active theme and
 * the counts; when any are stale, the stale layers grouped by token and stored colour (largest
 * first, with `examples` layers each), the count per page and board, and the fix
 * ({@link staleColoursFix}).
 *
 * @example
 * ```ts
 * // CJS
 * const { formatStaleColourReport } = require('@brrritscold/design-penpot-sdk-node/stale-colours')
 * // ESM
 * import { formatStaleColourReport } from '@brrritscold/design-penpot-sdk-node/stale-colours'
 *
 * formatStaleColourReport(findStaleColours(colours))
 * // ['agentdeck (d42f0aaa-…): active theme Mode/Dark; 25012 token colours checked, 0 stale.']
 * ```
 */
export const formatStaleColourReport = (
	report: StaleColourReport,
	{ examples = 3 }: { examples?: number } = {}
): string[] => {
	const { fileName, fileId, activeThemes, checked, stale } = report
	const header = `${fileName} (${fileId}): active theme ${activeThemes.join(', ') || 'none'}; ${checked} token colours checked, ${stale.length} stale.`
	if (stale.length === 0) return [header]

	const groups = new Map<string, { name: string; count: number; layers: StaleColour[] }>()
	const boards = new Map<string, { name: string; count: number }>()
	for (const layer of stale) {
		const key = JSON.stringify([layer.token, layer.found, layer.expected])
		const group = groups.get(key) ?? { name: layer.token, count: 0, layers: [] }
		group.count += 1
		group.layers.push(layer)
		groups.set(key, group)
		const boardName = `${layer.page} / ${layer.board}`
		const board = boards.get(boardName) ?? { name: boardName, count: 0 }
		board.count += 1
		boards.set(boardName, board)
	}

	const byToken = [...groups.values()].sort(countDescending).flatMap(({ count, layers }) => {
		const [{ token, found, expected }] = layers
		const shown = layers
			.slice(0, examples)
			.map(
				({ page, board, layerName, layerId, attribute, copy }) =>
					`    ${page} / ${board} / ${layerName} (${layerId}): ${attribute}, ${copy ? 'component copy' : 'page-local'}`
			)
		return [
			`  ${token}: ${count} ${count === 1 ? 'layer stores' : 'layers store'} ${formatColour(found)}, expected ${formatColour(expected)}`,
			...shown,
			...(count > examples ? [`    … and ${count - examples} more`] : []),
		]
	})
	const byBoard = [...boards.values()]
		.sort(countDescending)
		.map(({ name, count }) => `  ${name}: ${count}`)

	return [
		header,
		'',
		'By token:',
		...byToken,
		'',
		'By board:',
		...byBoard,
		'',
		staleColoursFix(report.fixTheme),
	]
}

/** What {@link runStaleColoursCli} reads and writes; the process by default. */
export type StaleColoursCliIo = {
	env: Record<string, string | undefined>
	stdout: (line: string) => void
	stderr: (line: string) => void
	fetch: typeof fetch
}

const processIo: StaleColoursCliIo = {
	env: process.env,
	stdout: (line) => console.log(line),
	stderr: (line) => console.error(line),
	fetch: (...args) => fetch(...args),
}

const USAGE = `Usage: design-stale-colours --file <file id>

  Reads a Penpot file (a page design or the library) and lists the layers whose stored fill or
  stroke colour differs from their applied token's value in the file's active theme. Read only.

  Needs PENPOT_URL and SNAPSHOT_REFRESH_PENPOT_TOKEN (an access token that can view the file).

Exit 0 when none is stale, 1 when any is, 2 on a usage error or a failed read.`

/** A usage error: the message and the usage go to stderr (exit 2). */
class UsageError extends Error {}

/**
 * Runs the `design-stale-colours` CLI and returns its exit code: 0 when no layer of the file
 * stores a stale colour, 1 when any does (with the fix on the last line), 2 on a usage error or
 * a failed read. Read only: it never writes to Penpot.
 */
export const runStaleColoursCli = async (
	argv: string[],
	io: StaleColoursCliIo = processIo
): Promise<number> => {
	try {
		let fileId: string | undefined
		try {
			fileId = parseArgs({ args: argv, options: { file: { type: 'string' } }, strict: true })
				.values.file
		} catch (error) {
			throw new UsageError((error as Error).message)
		}
		if (!fileId) throw new UsageError('Missing --file')

		const required = ['PENPOT_URL', 'SNAPSHOT_REFRESH_PENPOT_TOKEN']
		const missing = required.filter((name) => !io.env[name])
		if (missing.length)
			throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`)

		const report = findStaleColours(
			await readPageDesignColours({
				baseUrl: io.env.PENPOT_URL as string,
				accessToken: io.env.SNAPSHOT_REFRESH_PENPOT_TOKEN as string,
				fileId,
				fetch: io.fetch,
			})
		)
		for (const line of formatStaleColourReport(report)) io.stdout(line)
		return report.stale.length ? 1 : 0
	} catch (error) {
		if (error instanceof UsageError) {
			io.stderr(error.message)
			io.stderr(USAGE)
		} else io.stderr(`design-stale-colours failed: ${(error as Error).message}`)
		return 2
	}
}
