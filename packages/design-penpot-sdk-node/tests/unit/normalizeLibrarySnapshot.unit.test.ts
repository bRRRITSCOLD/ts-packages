// node_modules
import {
	type LibrarySnapshot,
	librarySnapshotSchema,
} from '@brrritscold/design-core-js/library-snapshot'
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
type RawShape = Record<string, unknown> & { id: string; shapes?: string[] }
type RawFile = {
	id: string
	data: {
		components: Record<string, RawComponent>
		pagesIndex: Record<string, { objects: Record<string, RawShape> }>
		tokensLib?: Record<string, unknown> | null
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

/** The main instance of a recorded component, and its page's layers, to mutate. */
const mainInstance = (file: RawFile, component: RawComponent) => {
	const objects = file.data.pagesIndex[component.mainInstancePage].objects
	return { main: objects[component.mainInstanceId], objects }
}

/** A component's layers, without the ids, keyed by name path: what the assertions read. */
const layersByNamePath = (snapshot: LibrarySnapshot, id: string) =>
	Object.fromEntries(
		Object.values(snapshot.components[id].layers).map(({ namePath, ...layer }) => [
			namePath.join(' / '),
			layer,
		])
	)

describe('normalizeLibrarySnapshot', () => {
	it('should give the header the Penpot pin, the library file id and the schema version', () => {
		const file = fixtureFile()

		const snapshot = normalizeLibrarySnapshot(file)

		expect(snapshot).toMatchObject({
			schemaVersion: 3,
			penpotVersion: '2.18.6',
			libraryFileId: file.id,
		})
		expect(librarySnapshotSchema.safeParse(snapshot).success).toBe(true)
	})

	it('should key every main component by its Penpot component id, normalized', () => {
		const file = fixtureFile()
		const id = (name: string, size?: string) => rawComponent(file, name, size).id

		const { components } = normalizeLibrarySnapshot(file)
		const withoutLayers = Object.fromEntries(
			Object.entries(components).map(([key, { layers: _, ...component }]) => [key, component])
		)

		expect(withoutLayers).toEqual({
			[id('Slot')]: {
				path: '_internal',
				name: 'Slot',
				variantProperties: {},
				parts: {},
				wrappers: [],
			},
			[id('Trash2')]: {
				path: 'icon',
				name: 'Trash2',
				variantProperties: {},
				parts: {},
				wrappers: [],
			},
			[id('Header')]: {
				path: 'Components/Card',
				name: 'Header',
				variantProperties: {},
				parts: {},
				wrappers: [],
			},
			[id('Content')]: {
				path: 'Components/Card',
				name: 'Content',
				variantProperties: {},
				parts: { Body: { componentId: id('Slot') } },
				wrappers: [],
				exceptionsRecord: { v: 1, slots: ['Body'] },
			},
			[id('Card')]: {
				path: 'Components',
				name: 'Card',
				variantProperties: {},
				parts: { Header: { componentId: id('Header') } },
				wrappers: ['Footer'],
			},
			[id('Button', 'default')]: {
				path: 'Components',
				name: 'Button',
				variantProperties: { size: 'default' },
				parts: {},
				wrappers: [],
			},
			[id('Button', 'sm')]: {
				path: 'Components',
				name: 'Button',
				variantProperties: { size: 'sm' },
				parts: {},
				wrappers: [],
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

	it('should give an empty library no components and no tokens', () => {
		const library = getFileBody(loadRecording('design-system-library'))

		expect(normalizeLibrarySnapshot(library)).toMatchObject({
			tokens: {},
			tokenThemes: [],
			components: {},
		})
	})

	describe('token catalog', () => {
		it('should give the token sets as DTCG in the shape of tokens.json, sorted, empty descriptions dropped', () => {
			const { tokens } = normalizeLibrarySnapshot(fixtureFile())

			expect(Object.keys(tokens)).toEqual(['dark', 'light', 'primitive'])
			expect(tokens.light).toEqual({
				background: { $type: 'color', $value: '{color.white}' },
				border: { $type: 'color', $value: '{color.neutral.200}' },
				foreground: { $type: 'color', $value: '{color.neutral.950}' },
				primary: { $type: 'color', $value: '{color.neutral.900}' },
				'primary-foreground': { $type: 'color', $value: '{color.neutral.50}' },
				radius: { $type: 'borderRadius', $value: '{border-radius.lg}' },
			})
			expect(tokens.primitive).toMatchObject({
				'font-weight': { medium: { $type: 'fontWeights', $value: 500 } },
				shadow: {
					xs: {
						$type: 'shadow',
						$value: {
							color: '#0000000d',
							offsetX: '0px',
							offsetY: '1px',
							blur: '2px',
							spread: '0px',
						},
					},
				},
			})
		})

		it('should give the themes with the sets each enables, without $metadata', () => {
			expect(normalizeLibrarySnapshot(fixtureFile()).tokenThemes).toEqual([
				{ group: 'Mode', name: 'Dark', sets: ['dark', 'primitive'] },
				{ group: 'Mode', name: 'Light', sets: ['light', 'primitive'] },
			])
		})

		it('should keep a non-empty token description', () => {
			const file = fixtureFile()
			const light = file.data.tokensLib?.light as Record<string, Record<string, unknown>>
			light.primary.$description = 'Buttons and links'

			expect(normalizeLibrarySnapshot(file).tokens.light.primary).toEqual({
				$type: 'color',
				$value: '{color.neutral.900}',
				$description: 'Buttons and links',
			})
		})
	})

	describe('layers: applied tokens and unbound attributes', () => {
		it('should record every layer of a main component with a checked attribute, nested part copies included', () => {
			const file = fixtureFile()
			const snapshot = normalizeLibrarySnapshot(file)
			const id = (name: string, size?: string) => rawComponent(file, name, size).id

			expect(layersByNamePath(snapshot, id('Card'))).toEqual({
				Card: {
					appliedTokens: {
						fill: 'background',
						'stroke-color': 'border',
						r1: 'radius',
						r2: 'radius',
						r3: 'radius',
						r4: 'radius',
						shadow: 'shadow.xs',
					},
					unbound: [],
				},
				'Card / Header': { appliedTokens: { fill: 'color.neutral.100' }, unbound: [] },
			})
			expect(layersByNamePath(snapshot, id('Button', 'sm'))).toEqual({
				'Components / Button': {
					appliedTokens: {
						fill: 'primary',
						r1: 'radius',
						r2: 'radius',
						r3: 'radius',
						r4: 'radius',
						'column-gap': 'space.2',
					},
					unbound: [],
				},
				'Components / Button / Label': {
					appliedTokens: {
						fill: 'primary-foreground',
						'font-weight': 'font-weight.medium',
					},
					unbound: [],
				},
			})
			expect(layersByNamePath(snapshot, id('Content'))).toEqual({
				Content: {
					appliedTokens: { p1: 'space.4', p2: 'space.4', p3: 'space.4', p4: 'space.4' },
					unbound: [],
				},
				'Content / Body': { appliedTokens: {}, unbound: ['fill'] },
			})
		})

		it('should key layers by Penpot layer id', () => {
			const file = fixtureFile()
			const slot = rawComponent(file, 'Slot')

			expect(normalizeLibrarySnapshot(file).components[slot.id].layers).toEqual({
				[slot.mainInstanceId]: { namePath: ['Slot'], appliedTokens: {}, unbound: ['fill'] },
			})
		})

		it('should leave out a layer with no checked attribute set and no token', () => {
			const file = fixtureFile()
			const card = rawComponent(file, 'Card')
			const { main, objects } = mainInstance(file, card)
			const footerId = (main.shapes ?? []).find((child) => objects[child].name === 'Footer')

			expect(normalizeLibrarySnapshot(file).components[card.id].layers).not.toHaveProperty(
				footerId as string
			)
		})

		it('should report a non-default value with no token as unbound, for each checked attribute', () => {
			const file = fixtureFile()
			const trash = rawComponent(file, 'Trash2')
			const { main } = mainInstance(file, trash)
			Object.assign(main, {
				appliedTokens: {},
				fills: [{ fillColor: '#000000', fillOpacity: 1 }],
				r3: 4,
				opacity: 0.5,
				shadow: [{ style: 'drop-shadow' }],
				layout: 'grid',
				layoutPadding: { p1: 0, p2: 4, p3: 0, p4: 0 },
				layoutGap: { rowGap: 4, columnGap: 0 },
			})

			expect(
				normalizeLibrarySnapshot(file).components[trash.id].layers[main.id as string]
			).toEqual({
				namePath: ['Trash2'],
				appliedTokens: {},
				unbound: ['fill', 'stroke-color', 'r3', 'p2', 'row-gap', 'shadow', 'opacity'],
			})
		})

		it('should report a text font family, size, weight or letter spacing off the default as unbound', () => {
			const file = fixtureFile()
			const button = rawComponent(file, 'Button', 'default')
			const { main, objects } = mainInstance(file, button)
			const label = objects[(main.shapes ?? [])[0]]
			label.content = {
				type: 'root',
				children: [
					{
						type: 'paragraph',
						fontFamily: 'Inter',
						children: [
							{ text: 'Go', fontSize: '16', fontWeight: '500', letterSpacing: '0.4' },
						],
					},
				],
			}

			expect(normalizeLibrarySnapshot(file).components[button.id].layers[label.id]).toEqual({
				namePath: ['Components / Button', 'Label'],
				appliedTokens: { fill: 'primary-foreground', 'font-weight': 'font-weight.medium' },
				unbound: ['font-family', 'font-size', 'letter-spacing'],
			})
		})

		it("should not report default values: no fill, radius 0, opacity 1, Penpot's default font, padding off a layout", () => {
			const file = fixtureFile()
			const button = rawComponent(file, 'Button', 'default')
			const { main, objects } = mainInstance(file, button)
			Object.assign(main, {
				appliedTokens: {},
				fills: [],
				r1: 0,
				r2: 0,
				r3: 0,
				r4: 0,
				opacity: 1,
				layout: null,
				layoutPadding: { p1: 8, p2: 8, p3: 8, p4: 8 },
			})
			const label = objects[(main.shapes ?? [])[0]]
			label.appliedTokens = {}
			label.content = {
				type: 'root',
				children: [
					{
						text: 'Go',
						fontFamily: 'sourcesanspro',
						fontSize: '14',
						fontWeight: '400',
						letterSpacing: '0',
						fills: [],
					},
				],
			}

			expect(normalizeLibrarySnapshot(file).components[button.id].layers).toEqual({})
		})

		it('should leave out tokens on exempt attributes: position, size, stroke width, rotation, margin', () => {
			const file = fixtureFile()
			const trash = rawComponent(file, 'Trash2')
			const { main } = mainInstance(file, trash)
			main.appliedTokens = {
				strokeColor: 'foreground',
				x: 'space.2',
				width: 'space.4',
				strokeWidth: 'space.2',
				rotation: 'space.2',
				m1: 'space.2',
			}

			expect(
				normalizeLibrarySnapshot(file).components[trash.id].layers[main.id as string]
			).toEqual({
				namePath: ['Trash2'],
				appliedTokens: { 'stroke-color': 'foreground' },
				unbound: [],
			})
		})
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

	describe('parts through layout wrappers', () => {
		/** Moves `childIds` of `parent` into a new plain board named `name`, in their place. */
		const wrap = (
			objects: Record<string, RawShape>,
			parent: RawShape,
			childIds: string[],
			name: string
		): RawShape => {
			const wrapper: RawShape = {
				id: `wrapper-${name}-${Object.keys(objects).length}`,
				name,
				type: 'frame',
				shapes: childIds,
				fills: [],
			}
			objects[wrapper.id] = wrapper
			const shapes = (parent.shapes ?? []).filter((id) => !childIds.includes(id))
			parent.shapes = [...shapes, wrapper.id]
			return wrapper
		}
		const cardWith = (file: RawFile) => {
			const card = rawComponent(file, 'Card')
			const { main, objects } = mainInstance(file, card)
			const headerId = (main.shapes as string[]).find((id) => objects[id].name === 'Header')
			if (!headerId) throw new Error('no Header copy in the recorded Card')
			return { card, main, objects, headerId }
		}

		it('should find a part through one plain board, and record the board as a wrapper', () => {
			const file = fixtureFile()
			const { card, main, objects, headerId } = cardWith(file)
			wrap(objects, main, [headerId], 'Top')

			const component = normalizeLibrarySnapshot(file).components[card.id]

			expect(component.parts).toEqual({
				Header: { componentId: rawComponent(file, 'Header').id },
			})
			expect(component.wrappers).toEqual(['Footer', 'Top'])
		})

		it('should find a part through two levels of plain board', () => {
			const file = fixtureFile()
			const { card, main, objects, headerId } = cardWith(file)
			const outer = wrap(objects, main, [headerId], 'Outer')
			wrap(objects, outer, [headerId], 'Inner')

			const component = normalizeLibrarySnapshot(file).components[card.id]

			expect(component.parts).toEqual({
				Header: { componentId: rawComponent(file, 'Header').id },
			})
			expect(component.wrappers).toEqual(['Footer', 'Inner', 'Outer'])
		})

		it('should not make a plain board a part', () => {
			const file = fixtureFile()
			const card = rawComponent(file, 'Card')

			expect(normalizeLibrarySnapshot(file).components[card.id].parts).not.toHaveProperty(
				'Footer'
			)
		})

		it('should stop at a copy: the layers inside a part are not parts', () => {
			const file = fixtureFile()
			const content = rawComponent(file, 'Content')
			const { main, objects } = mainInstance(file, content)
			const body = objects[(main.shapes as string[])[0]]
			wrap(objects, main, [body.id], 'Inside')

			expect(normalizeLibrarySnapshot(file).components[content.id].parts).toEqual({
				Body: { componentId: rawComponent(file, 'Slot').id },
			})
		})

		it('should keep a wrapper fill with no token as an unbound layer, for rule 7', () => {
			const file = fixtureFile()
			const { card, main, objects, headerId } = cardWith(file)
			const wrapper = wrap(objects, main, [headerId], 'Top')
			wrapper.fills = [{ fillColor: '#ff00ff', fillOpacity: 1 }]

			expect(layersByNamePath(normalizeLibrarySnapshot(file), card.id)['Card / Top']).toEqual(
				{
					appliedTokens: {},
					unbound: ['fill'],
				}
			)
		})

		it('should throw, naming the component, when two wrappers hold parts with one role', () => {
			const file = fixtureFile()
			const { main, objects, headerId } = cardWith(file)
			const copy = { ...objects[headerId], id: 'second-header' }
			objects[copy.id] = copy
			main.shapes = [...(main.shapes as string[]), copy.id]
			wrap(objects, main, [headerId], 'Left')
			wrap(objects, main, [copy.id], 'Right')

			expect(() => normalizeLibrarySnapshot(file)).toThrow(
				/Component Components \/ Card \(.+\) has two parts with the role `Header`/
			)
		})
	})

	it('should throw when two parts of one component share a role', () => {
		const file = fixtureFile()
		const card = rawComponent(file, 'Card')
		const { main, objects } = mainInstance(file, card)
		const header = Object.values(objects).find(
			({ id, name }) => name === 'Header' && main.shapes?.includes(id)
		) as RawShape
		objects['second-header'] = { ...header, id: 'second-header' }
		main.shapes = [...(main.shapes as string[]), 'second-header']

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

		it('should throw on a token applied to an attribute Penpot 2.18.6 does not have', () => {
			const file = fixtureFile()
			const { main } = mainInstance(file, rawComponent(file, 'Slot'))
			main.appliedTokens = { 'stroke-color': 'border' }

			expect(() => normalizeLibrarySnapshot(file)).toThrow(/changed shape.*appliedTokens/s)
		})

		it('should throw when a token theme stops listing its sets as `enabled`', () => {
			const file = fixtureFile()
			const themes = file.data.tokensLib?.$themes as { selectedTokenSets: unknown }[]
			themes[0].selectedTokenSets = ['light', 'primitive']

			expect(() => normalizeLibrarySnapshot(file)).toThrow(
				/tokensLib\.\$themes.*selectedTokenSets/s
			)
		})

		it('should throw on an unknown `$` key beside the token sets', () => {
			const file = fixtureFile()
			if (file.data.tokensLib) file.data.tokensLib.$extensions = {}

			expect(() => normalizeLibrarySnapshot(file)).toThrow(/unknown key `\$extensions`/)
		})

		it('should throw on a token that is not DTCG', () => {
			const file = fixtureFile()
			const light = file.data.tokensLib?.light as Record<string, unknown>
			light.primary = { value: '#000000', type: 'color' }

			expect(() => normalizeLibrarySnapshot(file)).toThrow(/tokensLib\.light/)
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
