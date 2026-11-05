/**
 * Re-records the committed `get-file` recordings from a live Penpot. Opt-in, run by hand at a
 * Penpot pin bump (`pnpm --filter @brrritscold/design-penpot-sdk-node record:penpot`), never in
 * CI. Needs `PENPOT_URL` and `SNAPSHOT_REFRESH_PENPOT_TOKEN` in the process env.
 *
 * Records two files, both read as the automation profile:
 * - `snapshot-fixture`, in the automation profile's own Drafts. The real library may be empty,
 *   so this file holds one of everything the normalizer reads. When it is missing (a fresh
 *   Penpot), it is created here through `create-file` + `update-file`; it is the only file this
 *   script ever writes, and an existing one is never changed.
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

/** A board (`frame`) with the attributes Penpot's shape schema requires, and no styling. */
const board = (
	id: string,
	name: string,
	parentId: string,
	{ x, y, width, height }: Box,
	extra: Record<string, unknown> = {}
) => ({
	id,
	name,
	type: 'frame',
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
	parentId,
	frameId: parentId,
	fills: [{ fillColor: '#FFFFFF', fillOpacity: 1 }],
	strokes: [],
	shapes: [],
	...extra,
})

/**
 * The changes that fill an empty fixture file: one of everything the normalizer reads.
 *
 * - `_internal/Slot`, the slot placeholder
 * - `icon/Trash2`
 * - `Components/Card/Header`
 * - `Components/Card/Content`, whose part `Body` is a copy of the slot and whose exceptions
 *   record lists `Body` in `slots`
 * - `Components/Card`, whose part `Header` is a copy of `Components/Card/Header` and whose
 *   part `Footer` is a plain board
 * - `Components/Button`, a variant set with property `size` = `default` | `sm`
 */
const fixtureChanges = (fileId: string, pageId: string): unknown[] => {
	const id = () => randomUUID()
	const shapes: { obj: ReturnType<typeof board> }[] = []
	const components: Record<string, unknown>[] = []

	const main = (
		componentId: string,
		componentName: string,
		path: string,
		parentId: string,
		box: Box,
		extra: Record<string, unknown> = {}
	) => {
		const shapeId = id()
		const shapeName = extra.name === undefined ? componentName : String(extra.name)
		shapes.push({
			obj: board(shapeId, shapeName, parentId, box, {
				componentId,
				componentFile: fileId,
				componentRoot: true,
				mainInstance: true,
				...extra,
			}),
		})
		components.push({
			type: 'add-component',
			id: componentId,
			name: componentName,
			path,
			mainInstanceId: shapeId,
			mainInstancePage: pageId,
			...(extra.variantId
				? {
						variantId: extra.variantId,
						variantProperties: [{ name: 'size', value: extra.variantName }],
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
		shapes.push({
			obj: board(id(), name, parentId, box, {
				componentId,
				componentFile: fileId,
				shapeRef: mainShapeId,
			}),
		})
	const plainBoard = (name: string, parentId: string, box: Box) =>
		shapes.push({ obj: board(id(), name, parentId, box) })

	const slot = id()
	const slotMain = main(
		slot,
		'Slot',
		'_internal',
		ROOT_FRAME_ID,
		{ x: 0, y: 0, width: 120, height: 40 },
		{}
	)
	shapes[shapes.length - 1].obj.fills = [{ fillColor: '#FF00FF', fillOpacity: 1 }]

	main(id(), 'Trash2', 'icon', ROOT_FRAME_ID, { x: 160, y: 0, width: 24, height: 24 })

	const header = id()
	const headerMain = main(header, 'Header', 'Components / Card', ROOT_FRAME_ID, {
		x: 240,
		y: 0,
		width: 200,
		height: 40,
	})

	const content = id()
	const contentMain = main(content, 'Content', 'Components / Card', ROOT_FRAME_ID, {
		x: 480,
		y: 0,
		width: 200,
		height: 80,
	})
	nestedCopy(slot, slotMain, 'Body', contentMain, { x: 480, y: 20, width: 120, height: 40 })

	const cardMain = main(id(), 'Card', 'Components', ROOT_FRAME_ID, {
		x: 720,
		y: 0,
		width: 200,
		height: 120,
	})
	nestedCopy(header, headerMain, 'Header', cardMain, { x: 720, y: 0, width: 200, height: 40 })
	plainBoard('Footer', cardMain, { x: 720, y: 80, width: 200, height: 40 })

	const buttonSet = id()
	shapes.push({
		obj: board(
			buttonSet,
			'Components / Button',
			ROOT_FRAME_ID,
			{ x: 0, y: 200, width: 240, height: 80 },
			{ isVariantContainer: true }
		),
	})
	for (const [index, size] of ['default', 'sm'].entries())
		main(
			id(),
			'Button',
			'Components',
			buttonSet,
			{ x: 20 + index * 110, y: 220, width: 90, height: 40 },
			{ name: 'Components / Button', variantId: buttonSet, variantName: size }
		)

	return [
		...shapes.map(({ obj }) => ({
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

/** The fixture file's id: found by name in the automation profile's Drafts, else created there. */
const ensureFixtureFile = async (): Promise<string> => {
	const profile = (await penpot.command('get-profile', {})) as { defaultProjectId: string }
	const files = (await penpot.command('get-project-files', {
		projectId: profile.defaultProjectId,
	})) as { id: string; name: string }[]
	const existing = files.find((file) => file.name === FIXTURE_FILE_NAME)
	if (existing) return existing.id

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
const fixtureFileId = await ensureFixtureFile()
mkdirSync(RECORDINGS_DIR, { recursive: true })
await record(fixtureFileId, 'snapshot-fixture')
await record(DESIGN_SYSTEM_LIBRARY_FILE_ID, 'design-system-library')
// Format as the repo's biome does, so a re-record diffs only where Penpot's answer changed.
execFileSync('biome', ['format', '--write', RECORDINGS_DIR], { stdio: 'inherit' })
