import { describe, expect, it } from 'vitest'

import { readSelection } from '../../src/adapter.js'
import { inspect } from '../../src/inspection.js'
import { fakePenpot, librarySnapshot, PAGE_FILE_ID } from '../fixtures/penpot.js'

const context = { currentFileId: PAGE_FILE_ID }

const inspectCopy = (
	build: ReturnType<typeof fakePenpot>['build'],
	shape: ReturnType<typeof build.copy>
) => {
	const node = readSelection(shape, context)
	if (!node) throw new Error('expected a link')
	return inspect(node)
}

describe('inspect', () => {
	it('should show the import, the JSX and where each prop came from', () => {
		const { build } = fakePenpot()
		const button = build.copy('button-outline-sm-disabled', {
			children: [
				build.copy('icon-trash-2', { layer: 'Icon' }),
				build.text('Delete', { x: 120 }),
			],
		})

		expect(inspectCopy(build, button)).toStrictEqual({
			title: 'Button',
			kind: 'component',
			imports: [
				"import { Button } from '@brrritscold/core-react'",
				"import { Trash2Icon } from '@brrritscold/core-react/icons'",
			],
			jsx: [
				'<Button disabled size="sm" variant="outline">',
				'  <Trash2Icon />',
				'  Delete',
				'</Button>',
			].join('\n'),
			props: [
				{ prop: 'disabled', value: 'true', source: 'exceptions-record' },
				{ prop: 'size', value: '"sm"', source: 'convention' },
				{ prop: 'variant', value: '"outline"', source: 'convention' },
			],
			unresolved: [],
		})
	})

	it('should put a lone text child inline and write `default` as an omitted prop', () => {
		const { build } = fakePenpot()

		const inspection = inspectCopy(
			build,
			build.copy('badge-default', { children: [build.text('New')] })
		)

		expect(inspection.jsx).toBe('<Badge>New</Badge>')
		expect(inspection.props).toStrictEqual([
			{ prop: 'variant', value: 'omitted', source: 'convention' },
		])
	})

	it('should write a `false` boolean prop explicitly', () => {
		const { build } = fakePenpot()

		expect(inspectCopy(build, build.copy('button-default', { children: [] })).jsx).toBe(
			'<Button disabled={false} />'
		)
	})

	it('should nest part exports, mark an empty slot and name a page-local component', () => {
		const { build } = fakePenpot()
		const local = build.localComponent('Notifications', 'Footer')
		const card = build.copy('card', {
			children: [
				build.copy('card-header', { layer: 'Header', children: [build.text('Settings')] }),
				build.copy('card-content', {
					layer: 'Content',
					y: 40,
					children: [
						build.localCopy(
							local,
							[build.copy('badge-secondary', { children: [build.text('Beta')] })],
							{ layer: 'Body' }
						),
					],
				}),
			],
		})

		const inspection = inspectCopy(build, card)

		expect(inspection.imports).toStrictEqual([
			"import { Badge, Card, CardContent, CardHeader } from '@brrritscold/core-react'",
		])
		expect(inspection.jsx).toBe(
			[
				'<Card>',
				'  <CardHeader>Settings</CardHeader>',
				'  <CardContent>',
				'    {/* page-local: Notifications/Footer (slot Body) */}',
				'    <Badge variant="secondary">Beta</Badge>',
				'  </CardContent>',
				'</Card>',
			].join('\n')
		)
		expect(inspection.props).toStrictEqual([])
	})

	it('should mark an empty slot in the JSX', () => {
		const { build } = fakePenpot()

		const inspection = inspectCopy(
			build,
			build.copy('card-content', { children: [build.copy('slot', { layer: 'Body' })] })
		)

		expect(inspection.jsx).toBe(
			['<CardContent>', '  {/* empty slot: Body */}', '</CardContent>'].join('\n')
		)
	})

	it('should mark an unresolved value in the JSX and list its hint', () => {
		const snapshot = librarySnapshot()
		const button = snapshot.components['button-default']
		if (!button) throw new Error('fixture: button-default')
		button.variantProperties = { ...button.variantProperties, state: 'Hover' }
		const { build } = fakePenpot({ snapshot })

		const inspection = inspectCopy(
			build,
			build.copy('button-default', { children: [build.text('Go')] })
		)

		expect(inspection.jsx).toBe(
			['<Button>', '  {/* unresolved: state = Hover */}', '  Go', '</Button>'].join('\n')
		)
		expect(inspection.unresolved).toStrictEqual([
			"Button: `state` = `Hover` isn't in the value map for `disabled` (`Default`, `Disabled`)",
		])
	})

	it('should write text JSX would read as syntax as a string expression', () => {
		const { build } = fakePenpot()

		expect(
			inspectCopy(build, build.copy('badge-default', { children: [build.text('<3 {x}')] }))
				.jsx
		).toBe('<Badge>{"<3 {x}"}</Badge>')
	})
})
