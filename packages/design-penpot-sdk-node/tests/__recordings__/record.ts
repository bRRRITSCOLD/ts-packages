/**
 * Re-records the committed `get-file` recordings from a live Penpot. Opt-in, run by hand at a
 * Penpot pin bump (`pnpm --filter @brrritscold/design-penpot-sdk-node record:penpot`), never in
 * CI. Needs `PENPOT_URL` and `SNAPSHOT_REFRESH_PENPOT_TOKEN` in the process env.
 *
 * Records two files, both read as the automation profile:
 * - `snapshot-fixture`, in the automation profile's own Drafts. The real library may be empty,
 *   so this file holds one of everything the normalizer reads, token catalog and applied
 *   tokens included. When it is missing (a fresh Penpot), it is created here through
 *   `create-file` + `update-file`. An existing one is kept as is, unless `--recreate` (after a
 *   change to its content below) deletes it and creates it again. It is the only file this
 *   script ever writes or deletes.
 * - the design system library, read only.
 *
 * Only what the client sent and Penpot answered is written: no request headers, so no token.
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'

import { createPenpotRpcClient, PENPOT_VERSION } from '../../src/rpc.js'
import {
	DESIGN_SYSTEM_LIBRARY_FILE_ID,
	FIXTURE_FILE_NAME,
	RECORDINGS_DIR,
	type RecordedInteraction,
	type Recording,
	recordingPath,
} from './recordings.js'

const requireEnv = (name: string): string => {
	const value = process.env[name]
	if (!value) throw new Error(`${name} is not set; record:penpot reads it from the process env`)
	return value
}

const baseUrl = requireEnv('PENPOT_URL').replace(/\/+$/, '')
const accessToken = requireEnv('SNAPSHOT_REFRESH_PENPOT_TOKEN')

/** Every request the client makes while recording, with Penpot's answer. */
let interactions: RecordedInteraction[] = []

const recordingFetch: typeof fetch = async (input, init) => {
	const url = new URL(String(input))
	const response = await fetch(input, init)
	const text = await response.clone().text()
	const isJson = (response.headers.get('content-type') ?? '').includes('application/json')
	interactions.push({
		method: (init?.method ?? 'GET').toUpperCase() as RecordedInteraction['method'],
		path: url.pathname,
		...(init?.body ? { requestBody: JSON.parse(String(init.body)) } : {}),
		status: response.status,
		...(isJson ? { responseBody: JSON.parse(text) } : { responseText: text }),
	})
	return response
}

const penpot = createPenpotRpcClient({ baseUrl, accessToken, fetch: recordingFetch })

// --- the fixture file -------------------------------------------------------------------------

const ROOT_FRAME_ID = '00000000-0000-0000-0000-000000000000'
const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

type Box = { x: number; y: number; width: number; height: number }

/** Where a layer is, with the transform attributes Penpot's shape schema requires. */
const geometry = ({ x, y, width, height }: Box) => ({
	x,
	y,
	width,
	height,
	rotation: 0,
	selrect: { x, y, width, height, x1: x, y1: y, x2: x + width, y2: y + height },
	points: [
		{ x, y },
		{ x: x + width, y },
		{ x: x + width, y: y + height },
		{ x, y: y + height },
	],
	transform: IDENTITY,
	transformInverse: IDENTITY,
})

/** A board (`frame`) with no fill, no stroke and no children, plus `extra` attributes. */
const board = (
	id: string,
	name: string,
	parentId: string,
	box: Box,
	extra: Record<string, unknown> = {}
) => ({
	id,
	name,
	type: 'frame',
	...geometry(box),
	parentId,
	frameId: parentId,
	fills: [] as unknown[],
	strokes: [] as unknown[],
	shapes: [] as string[],
	...extra,
})

/** A one-line text layer in Source Sans Pro (Penpot's default font) with these leaf attributes. */
const text = (
	id: string,
	name: string,
	parentId: string,
	box: Box,
	leaf: Record<string, unknown>,
	extra: Record<string, unknown> = {}
) => ({
	id,
	name,
	type: 'text',
	...geometry(box),
	parentId,
	frameId: parentId,
	growType: 'auto-width',
	content: {
		type: 'root',
		children: [
			{
				type: 'paragraph-set',
				children: [
					{
						type: 'paragraph',
						children: [
							{
								text: name,
								fontId: 'sourcesanspro',
								fontFamily: 'sourcesanspro',
								fontVariantId: 'regular',
								fontSize: '14',
								fontWeight: '400',
								fontStyle: 'normal',
								letterSpacing: '0',
								...leaf,
							},
						],
					},
				],
			},
		],
	},
	...extra,
})

const fill = (fillColor: string) => [{ fillColor, fillOpacity: 1 }]
const stroke = (strokeColor: string) => [
	{
		strokeColor,
		strokeOpacity: 1,
		strokeWidth: 1,
		strokeStyle: 'solid',
		strokeAlignment: 'inner',
	},
]
const radius = (r: number) => ({ r1: r, r2: r, r3: r, r4: r })

/**
 * The fixture's token catalog: a few tokens of core-react's token file with their values, in
 * the sets `primitive`, `light` and `dark`, and the themes token sync writes (`Mode` / `Light`
 * and `Dark`, Light active). Each entry is `[set, name, DTCG type, value]`.
 */
const FIXTURE_TOKENS: [set: string, name: string, type: string, value: unknown][] = [
	['primitive', 'color.white', 'color', '#ffffff'],
	['primitive', 'color.neutral.50', 'color', '#fafafa'],
	['primitive', 'color.neutral.100', 'color', '#f5f5f5'],
	['primitive', 'color.neutral.200', 'color', '#e5e5e5'],
	['primitive', 'color.neutral.800', 'color', '#262626'],
	['primitive', 'color.neutral.900', 'color', '#171717'],
	['primitive', 'color.neutral.950', 'color', '#0a0a0a'],
	['primitive', 'space.2', 'spacing', '8px'],
	['primitive', 'space.4', 'spacing', '16px'],
	['primitive', 'border-radius.lg', 'borderRadius', '10px'],
	['primitive', 'font-weight.medium', 'fontWeights', 500],
	[
		'primitive',
		'shadow.xs',
		'shadow',
		{ color: '#0000000d', offsetX: '0px', offsetY: '1px', blur: '2px', spread: '0px' },
	],
	['light', 'background', 'color', '{color.white}'],
	['light', 'foreground', 'color', '{color.neutral.950}'],
	['light', 'primary', 'color', '{color.neutral.900}'],
	['light', 'primary-foreground', 'color', '{color.neutral.50}'],
	['light', 'border', 'color', '{color.neutral.200}'],
	['light', 'radius', 'borderRadius', '{border-radius.lg}'],
	['dark', 'background', 'color', '{color.neutral.950}'],
	['dark', 'foreground', 'color', '{color.neutral.50}'],
	['dark', 'primary', 'color', '{color.neutral.200}'],
	['dark', 'primary-foreground', 'color', '{color.neutral.900}'],
	['dark', 'border', 'color', '{color.neutral.800}'],
	['dark', 'radius', 'borderRadius', '{border-radius.lg}'],
]

/** The changes that write {@link FIXTURE_TOKENS}: sets, tokens, themes, the active theme. */
const tokenChanges = (): unknown[] => {
	const setIds = new Map(['primitive', 'light', 'dark'].map((set) => [set, randomUUID()]))
	const theme = (name: string, sets: string[]) => {
		const id = randomUUID()
		return { type: 'set-token-theme', id, attrs: { id, name, group: 'Mode', sets } }
	}
	return [
		...[...setIds].map(([name, id]) => ({ type: 'set-token-set', id, attrs: { id, name } })),
		...FIXTURE_TOKENS.map(([set, name, type, value]) => {
			const tokenId = randomUUID()
			return {
				type: 'set-token',
				setId: setIds.get(set),
				tokenId,
				attrs: { id: tokenId, name, type, value },
			}
		}),
		theme('Light', ['primitive', 'light']),
		theme('Dark', ['primitive', 'dark']),
		{ type: 'set-active-token-themes', themePaths: ['Mode/Light'] },
	]
}

/**
 * The changes that fill an empty fixture file: one of everything the normalizer reads.
 *
 * - the token catalog ({@link FIXTURE_TOKENS})
 * - `_internal/Slot`, the slot placeholder: a raw magenta fill, the **unbound** attribute
 * - `icon/Trash2`: stroke colour `foreground`
 * - `Components/Card/Header`: fill `color.neutral.100`, a **primitive colour**
 * - `Components/Card/Content`, a flex board with padding `space.4` on every side, whose part
 *   `Body` is a copy of the slot and whose exceptions record lists `Body` in `slots`
 * - `Components/Card`: fill `background`, stroke `border`, radius `radius`, shadow `shadow.xs`;
 *   its part `Header` is a copy of `Components/Card/Header`, its part `Footer` a plain board
 * - `Components/Button`, a variant set with property `size` = `default` | `sm`: a flex board
 *   with fill `primary`, radius `radius` and column gap `space.2` holding a `Label` text with
 *   fill `primary-foreground` and font weight `font-weight.medium`
 */
const fixtureChanges = (fileId: string, pageId: string): unknown[] => {
	const id = () => randomUUID()
	const shapes: Record<string, unknown>[] = []
	const components: Record<string, unknown>[] = []
	/** Each main instance's own attributes, which a copy of it repeats. */
	const styleOf = new Map<string, Record<string, unknown>>()

	const main = (
		componentId: string,
		componentName: string,
		path: string,
		parentId: string,
		box: Box,
		style: Record<string, unknown> = {},
		variant?: { variantId: string; size: string }
	) => {
		const shapeId = id()
		const shapeName = variant ? 'Components / Button' : componentName
		styleOf.set(shapeId, style)
		shapes.push(
			board(shapeId, shapeName, parentId, box, {
				componentId,
				componentFile: fileId,
				componentRoot: true,
				mainInstance: true,
				...style,
				...(variant ? { variantId: variant.variantId } : {}),
			})
		)
		components.push({
			type: 'add-component',
			id: componentId,
			name: componentName,
			path,
			mainInstanceId: shapeId,
			mainInstancePage: pageId,
			...(variant
				? {
						variantId: variant.variantId,
						variantProperties: [{ name: 'size', value: variant.size }],
					}
				: {}),
		})
		return shapeId
	}
	const nestedCopy = (
		componentId: string,
		mainShapeId: string,
		name: string,
		parentId: string,
		box: Box
	) =>
		shapes.push(
			board(id(), name, parentId, box, {
				componentId,
				componentFile: fileId,
				shapeRef: mainShapeId,
				...styleOf.get(mainShapeId),
			})
		)

	const slot = id()
	const slotMain = main(
		slot,
		'Slot',
		'_internal',
		ROOT_FRAME_ID,
		{ x: 0, y: 0, width: 120, height: 40 },
		{ fills: fill('#FF00FF') }
	)

	main(
		id(),
		'Trash2',
		'icon',
		ROOT_FRAME_ID,
		{ x: 160, y: 0, width: 24, height: 24 },
		{ strokes: stroke('#0a0a0a'), appliedTokens: { strokeColor: 'foreground' } }
	)

	const header = id()
	const headerMain = main(
		header,
		'Header',
		'Components / Card',
		ROOT_FRAME_ID,
		{ x: 240, y: 0, width: 200, height: 40 },
		{ fills: fill('#f5f5f5'), appliedTokens: { fill: 'color.neutral.100' } }
	)

	const content = id()
	const contentMain = main(
		content,
		'Content',
		'Components / Card',
		ROOT_FRAME_ID,
		{ x: 480, y: 0, width: 200, height: 80 },
		{
			layout: 'flex',
			layoutFlexDir: 'column',
			layoutPaddingType: 'multiple',
			layoutPadding: { p1: 16, p2: 16, p3: 16, p4: 16 },
			appliedTokens: { p1: 'space.4', p2: 'space.4', p3: 'space.4', p4: 'space.4' },
		}
	)
	nestedCopy(slot, slotMain, 'Body', contentMain, { x: 496, y: 16, width: 120, height: 40 })

	const cardMain = main(
		id(),
		'Card',
		'Components',
		ROOT_FRAME_ID,
		{ x: 720, y: 0, width: 200, height: 120 },
		{
			fills: fill('#ffffff'),
			strokes: stroke('#e5e5e5'),
			...radius(10),
			shadow: [
				{
					id: id(),
					style: 'drop-shadow',
					offsetX: 0,
					offsetY: 1,
					blur: 2,
					spread: 0,
					hidden: false,
					color: { color: '#000000', opacity: 0.05 },
				},
			],
			appliedTokens: {
				fill: 'background',
				strokeColor: 'border',
				r1: 'radius',
				r2: 'radius',
				r3: 'radius',
				r4: 'radius',
				shadow: 'shadow.xs',
			},
		}
	)
	nestedCopy(header, headerMain, 'Header', cardMain, { x: 720, y: 0, width: 200, height: 40 })
	shapes.push(board(id(), 'Footer', cardMain, { x: 720, y: 80, width: 200, height: 40 }))

	const buttonSet = id()
	shapes.push(
		board(
			buttonSet,
			'Components / Button',
			ROOT_FRAME_ID,
			{ x: 0, y: 200, width: 240, height: 80 },
			{ isVariantContainer: true }
		)
	)
	for (const [index, size] of ['default', 'sm'].entries()) {
		const x = 20 + index * 110
		const button = main(
			id(),
			'Button',
			'Components',
			buttonSet,
			{ x, y: 220, width: 90, height: 40 },
			{
				fills: fill('#171717'),
				...radius(10),
				layout: 'flex',
				layoutFlexDir: 'row',
				layoutGapType: 'multiple',
				layoutGap: { rowGap: 0, columnGap: 8 },
				appliedTokens: {
					fill: 'primary',
					r1: 'radius',
					r2: 'radius',
					r3: 'radius',
					r4: 'radius',
					columnGap: 'space.2',
				},
			},
			{ variantId: buttonSet, size }
		)
		shapes.push(
			text(
				id(),
				'Label',
				button,
				{ x: x + 16, y: 230, width: 40, height: 20 },
				{ fontWeight: '500', fills: fill('#fafafa') },
				{ appliedTokens: { fill: 'primary-foreground', fontWeight: 'font-weight.medium' } }
			)
		)
	}

	// Penpot lists each added layer in its parent's `shapes`, so parents go first.
	return [
		...tokenChanges(),
		...shapes.map((obj) => ({
			type: 'add-obj',
			id: obj.id,
			pageId,
			parentId: obj.parentId,
			frameId: obj.frameId,
			obj,
		})),
		...components,
		{
			type: 'set-plugin-data',
			objectType: 'component',
			objectId: content,
			namespace: 'shared/brrritscold.core-react',
			key: 'link',
			value: JSON.stringify({ v: 1, slots: ['Body'] }),
		},
	]
}

/**
 * The fixture file's id: found by name in the automation profile's Drafts, else created there.
 * With `recreate`, an existing fixture file is deleted first and built again from
 * {@link fixtureChanges}: what a change to the fixture's content needs.
 */
const ensureFixtureFile = async (recreate: boolean): Promise<string> => {
	const profile = (await penpot.command('get-profile', {})) as { defaultProjectId: string }
	const files = (await penpot.command('get-project-files', {
		projectId: profile.defaultProjectId,
	})) as { id: string; name: string }[]
	const existing = files.filter((file) => file.name === FIXTURE_FILE_NAME)
	if (existing.length && !recreate) return existing[0].id
	for (const file of existing) {
		await penpot.command('delete-file', { id: file.id })
		console.log(
			`deleted ${FIXTURE_FILE_NAME} (${file.id}) from the automation profile's Drafts`
		)
	}

	const created = (await penpot.command('create-file', {
		name: FIXTURE_FILE_NAME,
		projectId: profile.defaultProjectId,
		isShared: true,
	})) as { id: string; revn: number; vern: number; data: { pages: string[] } }
	try {
		await penpot.command('update-file', {
			id: created.id,
			sessionId: randomUUID(),
			revn: created.revn,
			vern: created.vern,
			changes: fixtureChanges(created.id, created.data.pages[0]),
		})
	} catch (error) {
		// An empty fixture file would be found by name next time and recorded as is.
		await penpot.command('delete-file', { id: created.id })
		throw error
	}
	console.log(`created ${FIXTURE_FILE_NAME} (${created.id}) in the automation profile's Drafts`)
	return created.id
}

// --- record -----------------------------------------------------------------------------------

/** Records `assertVersion` + `getFile` for one file, exactly as `readLibrarySnapshot` calls them. */
const record = async (fileId: string, name: string) => {
	interactions = []
	await penpot.assertVersion()
	await penpot.getFile(fileId)
	const recording: Recording = { penpotVersion: PENPOT_VERSION, fileId, interactions }
	writeFileSync(recordingPath(name), `${JSON.stringify(recording, null, '\t')}\n`)
	console.log(`recorded ${recordingPath(name)}`)
}

await penpot.assertVersion()
const fixtureFileId = await ensureFixtureFile(process.argv.includes('--recreate'))
mkdirSync(RECORDINGS_DIR, { recursive: true })
await record(fixtureFileId, 'snapshot-fixture')
await record(DESIGN_SYSTEM_LIBRARY_FILE_ID, 'design-system-library')
// Format as the repo's biome does, so a re-record diffs only where Penpot's answer changed.
execFileSync('biome', ['format', '--write', RECORDINGS_DIR], { stdio: 'inherit' })
