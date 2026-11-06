import { describe, expect, it } from 'vitest'

import { readSelection } from '../../src/adapter.js'
import { fakePenpot, librarySnapshot, PAGE_FILE_ID } from '../fixtures/penpot.js'

const context = { currentFileId: PAGE_FILE_ID }

describe('readSelection', () => {
	it('should resolve a copy to its export, with props from naming and from the exceptions record', () => {
		const { build } = fakePenpot()
		const button = build.copy('button-outline-sm-disabled', {
			children: [build.text('Archive')],
		})

		expect(readSelection(button, context)).toStrictEqual({
			kind: 'component',
			layer: 'Button',
			id: button.id,
			package: '@brrritscold/core-react',
			export: 'Button',
			props: {
				size: { value: 'sm', source: 'convention' },
				variant: { value: 'outline', source: 'convention' },
				disabled: { value: true, source: 'exceptions-record' },
			},
			unresolved: [],
			exceptionsRecord: 'valid',
			hints: [],
			children: [{ kind: 'text', layer: 'Label', id: expect.any(String), text: 'Archive' }],
		})
	})

	it('should omit a prop whose variant value is `default`', () => {
		const { build } = fakePenpot()

		const node = readSelection(build.copy('badge-default', { children: [] }), context)

		expect(node).toMatchObject({ export: 'Badge', props: { variant: { value: undefined } } })
	})

	it('should resolve an icon copy to its `<Name>Icon` export', () => {
		const { build } = fakePenpot()

		expect(readSelection(build.copy('icon-trash-2'), context)).toMatchObject({
			kind: 'icon',
			package: '@brrritscold/core-react/icons',
			export: 'Trash2Icon',
		})
	})

	it('should read the link of the instance a selected inner layer belongs to', () => {
		const { build } = fakePenpot()
		const label = build.text('Save')
		build.copy('button-default', { children: [label] })

		expect(readSelection(label, context)).toMatchObject({ export: 'Button' })
	})

	it('should return undefined for a layer outside any instance', () => {
		const { build } = fakePenpot()

		expect(readSelection(build.board('Screen', []), context)).toBeUndefined()
	})

	it('should read a compound copy as nested part exports in visual order, the empty slot marked', () => {
		const { build } = fakePenpot()
		const card = build.copy('card', {
			// Penpot lists children in layer order, not reading order.
			children: [
				build.copy('card-content', {
					layer: 'Content',
					y: 40,
					children: [build.copy('slot', { layer: 'Body' })],
				}),
				build.copy('card-header', {
					layer: 'Header',
					y: 0,
					children: [build.text('Title')],
				}),
			],
		})

		expect(readSelection(card, context)).toMatchObject({
			export: 'Card',
			children: [
				{ kind: 'component', export: 'CardHeader', layer: 'Header' },
				{
					kind: 'component',
					export: 'CardContent',
					children: [{ kind: 'empty-slot', layer: 'Body', slot: 'Body' }],
				},
			],
		})
	})

	it('should read parts through layout wrappers without a node for the wrapper', () => {
		const { build } = fakePenpot()
		const card = build.copy('card', {
			children: [
				build.board('Stack', [
					build.group('Row', [
						build.copy('card-header', { layer: 'Header', children: [] }),
					]),
				]),
			],
		})

		expect(readSelection(card, context)).toMatchObject({
			children: [{ kind: 'component', export: 'CardHeader' }],
		})
	})

	it('should read a page-local component swapped into a slot as local, its library copies linked', () => {
		const { build } = fakePenpot()
		const local = build.localComponent('Notifications', 'Content')
		const content = build.copy('card-content', {
			children: [
				build.localCopy(
					local,
					[build.copy('badge-secondary', { children: [build.text('Beta')] })],
					{
						layer: 'Body',
					}
				),
			],
		})

		expect(readSelection(content, context)).toMatchObject({
			export: 'CardContent',
			children: [
				{
					kind: 'local',
					component: 'Notifications/Content',
					slot: 'Body',
					children: [
						{
							kind: 'component',
							export: 'Badge',
							props: { variant: { value: 'secondary' } },
						},
					],
				},
			],
		})
	})

	it('should leave hidden layers out', () => {
		const { build } = fakePenpot()
		const button = build.copy('button-default', {
			children: [build.copy('icon-trash-2', { hidden: true }), build.text('Delete')],
		})

		expect(readSelection(button, context)).toMatchObject({
			children: [{ kind: 'text', text: 'Delete' }],
		})
	})

	it('should link a main component in the library file itself', () => {
		const snapshot = librarySnapshot()
		const { build } = fakePenpot({ snapshot, currentFileId: snapshot.libraryFileId })

		expect(
			readSelection(build.copy('card-header', { children: [] }), {
				currentFileId: snapshot.libraryFileId,
			})
		).toMatchObject({ kind: 'component', export: 'CardHeader' })
	})

	it('should mark a variant value missing from the value map as unresolved', () => {
		const snapshot = librarySnapshot()
		const hover = snapshot.components['button-default']
		if (!hover) throw new Error('fixture: button-default')
		hover.variantProperties = { ...hover.variantProperties, state: 'Hover' }
		const { build } = fakePenpot({ snapshot })

		const node = readSelection(build.copy('button-default', { children: [] }), context)

		expect(node).toMatchObject({
			unresolved: [{ variantProperty: 'state', value: 'Hover' }],
			hints: [
				"`state` = `Hover` isn't in the value map for `disabled` (`Default`, `Disabled`)",
			],
		})
	})

	it('should hint `did you mean` when the exceptions record names a variant property by a near miss', () => {
		const { build } = fakePenpot({
			records: {
				'button-default': JSON.stringify({
					v: 1,
					props: { disabled: { from: 'State', map: { Default: false, Disabled: true } } },
				}),
			},
		})

		const node = readSelection(build.copy('button-default', { children: [] }), context)

		expect(node).toMatchObject({
			props: { state: { value: 'Default', source: 'convention' } },
			hints: [
				"The exceptions record sets `disabled` from variant property `State`, which this component doesn't have; did you mean `state`?",
			],
		})
	})

	it('should hint `did you mean` for a slot role that is a near miss of a part', () => {
		const { build } = fakePenpot({
			records: { 'card-content': JSON.stringify({ v: 1, slots: ['body'] }) },
		})

		const node = readSelection(
			build.copy('card-content', { children: [build.copy('slot', { layer: 'Body' })] }),
			context
		)

		expect(node).toMatchObject({
			hints: [
				"The exceptions record lists slot `body`, which isn't a part here; did you mean `Body`?",
			],
		})
		expect(node?.kind === 'component' && node.children[0]).not.toHaveProperty('slot')
	})

	it('should ignore an invalid exceptions record and say why', () => {
		const { build } = fakePenpot({
			records: { 'button-default': JSON.stringify({ v: 1, slot: ['Body'] }) },
		})

		const node = readSelection(build.copy('button-default', { children: [] }), context)

		expect(node).toMatchObject({
			exceptionsRecord: 'invalid',
			props: { state: { value: 'Default', source: 'convention' } },
			hints: [
				'The exceptions record is invalid and was ignored: (record): Unrecognized key: "slot"',
			],
		})
	})

	it('should say so when the exceptions record is not JSON', () => {
		const { build } = fakePenpot({ records: { 'button-default': '{v:1' } })

		const node = readSelection(build.copy('button-default', { children: [] }), context)

		expect(node).toMatchObject({
			exceptionsRecord: 'invalid',
			hints: ['The exceptions record is invalid and was ignored: it is not JSON'],
		})
	})

	it('should never write plugin data', () => {
		const { build, writes } = fakePenpot()

		readSelection(build.copy('card'), context)

		expect(writes.setSharedPluginData).not.toHaveBeenCalled()
		expect(writes.setPluginData).not.toHaveBeenCalled()
	})
})
