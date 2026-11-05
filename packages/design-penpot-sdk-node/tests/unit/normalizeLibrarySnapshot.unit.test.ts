// node_modules
import { librarySnapshotSchema } from '@brrritscold/design-core-js/library-snapshot'
import { describe, expect, it } from 'vitest'

// testee
import { normalizeLibrarySnapshot } from '../../src/library-snapshot.js'
// fixtures
import { getFileBody, loadRecording } from '../__recordings__/recordings.js'

type RawComponent = Record<string, unknown> & {
	id: string
	name: string
	path: string
	mainInstanceId: string
	mainInstancePage: string
	variantProperties?: { name: string; value: string }[]
	pluginData?: Record<string, Record<string, string>>
}
type RawFile = {
	id: string
	data: {
		components: Record<string, RawComponent>
		pagesIndex: Record<string, { objects: Record<string, Record<string, unknown>> }>
	}
}

/** A fresh, mutable copy of the recorded `get-file` answer for the fixture file. */
const fixtureFile = () => getFileBody(loadRecording('snapshot-fixture')) as RawFile

/** The recorded component with this name (and variant value, for a variant). */
const rawComponent = (file: RawFile, name: string, size?: string): RawComponent => {
	const found = Object.values(file.data.components).find(
		(c) => c.name === name && (size === undefined || c.variantProperties?.[0]?.value === size)
	)
	if (!found) throw new Error(`no ${name} ${size ?? ''} in the recording`)
	return found
}

describe('normalizeLibrarySnapshot', () => {
	it('should give the header the Penpot pin, the library file id and the schema version', () => {
		const file = fixtureFile()

		const snapshot = normalizeLibrarySnapshot(file)

		expect(snapshot).toMatchObject({
			schemaVersion: 1,
			penpotVersion: '2.18.6',
			libraryFileId: file.id,
		})
		expect(librarySnapshotSchema.safeParse(snapshot).success).toBe(true)
	})

	it('should key every main component by its Penpot component id, normalized', () => {
		const file = fixtureFile()
		const id = (name: string, size?: string) => rawComponent(file, name, size).id

		const { components } = normalizeLibrarySnapshot(file)

		expect(components).toEqual({
			[id('Slot')]: { path: '_internal', name: 'Slot', variantProperties: {}, parts: {} },
			[id('Trash2')]: { path: 'icon', name: 'Trash2', variantProperties: {}, parts: {} },
			[id('Header')]: {
				path: 'Components/Card',
				name: 'Header',
				variantProperties: {},
				parts: {},
			},
			[id('Content')]: {
				path: 'Components/Card',
				name: 'Content',
				variantProperties: {},
				parts: { Body: { componentId: id('Slot') } },
				exceptionsRecord: { v: 1, slots: ['Body'] },
			},
			[id('Card')]: {
				path: 'Components',
				name: 'Card',
				variantProperties: {},
				parts: { Footer: { componentId: null }, Header: { componentId: id('Header') } },
			},
			[id('Button', 'default')]: {
				path: 'Components',
				name: 'Button',
				variantProperties: { size: 'default' },
				parts: {},
			},
			[id('Button', 'sm')]: {
				path: 'Components',
				name: 'Button',
				variantProperties: { size: 'sm' },
				parts: {},
			},
		})
	})

	it('should sort components by id and come out the same whatever order Penpot sends', () => {
		const file = fixtureFile()
		const reversed = fixtureFile()
		reversed.data.components = Object.fromEntries(
			Object.entries(reversed.data.components).reverse()
		)

		const snapshot = normalizeLibrarySnapshot(file)

		expect(Object.keys(snapshot.components)).toEqual(Object.keys(snapshot.components).sort())
		expect(JSON.stringify(normalizeLibrarySnapshot(reversed))).toBe(JSON.stringify(snapshot))
	})

	it('should give an empty library no components', () => {
		const library = getFileBody(loadRecording('design-system-library'))

		expect(normalizeLibrarySnapshot(library).components).toEqual({})
	})

	it('should leave deleted components out', () => {
		const file = fixtureFile()
		const trash = rawComponent(file, 'Trash2')
		trash.deleted = true

		expect(normalizeLibrarySnapshot(file).components).not.toHaveProperty(trash.id)
	})

	it('should keep an exceptions record that is not JSON as its raw string, for drift rule 5', () => {
		const file = fixtureFile()
		const content = rawComponent(file, 'Content')
		content.pluginData = { brrritscoldCoreReact: { link: '{"v":1,' } }

		expect(normalizeLibrarySnapshot(file).components[content.id].exceptionsRecord).toBe(
			'{"v":1,'
		)
	})

	it('should throw when two parts of one component share a role', () => {
		const file = fixtureFile()
		const card = rawComponent(file, 'Card')
		const objects = file.data.pagesIndex[card.mainInstancePage].objects
		for (const childId of objects[card.mainInstanceId].shapes as string[])
			objects[childId].name = 'Header'

		expect(() => normalizeLibrarySnapshot(file)).toThrow(/two parts with the role `Header`/)
	})

	describe('a shape change in get-file', () => {
		it('should throw on a renamed component field, naming it', () => {
			const file = fixtureFile()
			const card = rawComponent(file, 'Card')
			card.mainInstanceID = card.mainInstanceId
			delete (card as Partial<RawComponent>).mainInstanceId

			expect(() => normalizeLibrarySnapshot(file)).toThrow(
				new RegExp(`data\\.components\\.${card.id}.*mainInstanceId`, 's')
			)
		})

		it('should throw on a retyped component field', () => {
			const file = fixtureFile()
			;(rawComponent(file, 'Header') as Record<string, unknown>).path = ['Components', 'Card']

			expect(() => normalizeLibrarySnapshot(file)).toThrow(/changed shape.*path/s)
		})

		it('should throw on a renamed layer field of a main instance', () => {
			const file = fixtureFile()
			const card = rawComponent(file, 'Card')
			const main = file.data.pagesIndex[card.mainInstancePage].objects[card.mainInstanceId]
			main.children = main.shapes
			delete main.shapes
			main.name = undefined

			expect(() => normalizeLibrarySnapshot(file)).toThrow(/main instance.*name/s)
		})

		it('should throw when pagesIndex is renamed', () => {
			const file = fixtureFile() as unknown as { data: Record<string, unknown> }
			file.data.pages_index = file.data.pagesIndex
			delete file.data.pagesIndex

			expect(() => normalizeLibrarySnapshot(file)).toThrow(/get-file.*pagesIndex/s)
		})

		it('should throw when a main instance is missing from its page', () => {
			const file = fixtureFile()
			const header = rawComponent(file, 'Header')
			delete file.data.pagesIndex[header.mainInstancePage].objects[header.mainInstanceId]

			expect(() => normalizeLibrarySnapshot(file)).toThrow(
				new RegExp(`no layer ${header.mainInstanceId}`)
			)
		})

		it('should throw when a variant loses its variantProperties', () => {
			const file = fixtureFile()
			delete rawComponent(file, 'Button', 'sm').variantProperties

			expect(() => normalizeLibrarySnapshot(file)).toThrow(/variantProperties/)
		})

		it('should throw when the plugin-data key stops being camel-cased', () => {
			const file = fixtureFile()
			const content = rawComponent(file, 'Content')
			content.pluginData = {
				'shared/brrritscold.core-react': content.pluginData?.brrritscoldCoreReact ?? {},
			}

			expect(() => normalizeLibrarySnapshot(file)).toThrow(
				/expected the plugin-data key `brrritscoldCoreReact`, found `shared\/brrritscold.core-react`/
			)
		})
	})
})
