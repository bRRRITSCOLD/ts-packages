import { describe, expect, it } from 'vitest'

import type { LinkNode } from '../../src/adapter.js'
import { readLinks } from '../../src/read-links.js'
import { fakePenpot } from '../fixtures/penpot.js'

describe('readLinks', () => {
	it('should return every link on the page in one call, in visual order', () => {
		const { penpot, build } = fakePenpot()
		const screen = build.board(
			'Settings',
			[
				// Layer order deliberately differs from reading order.
				build.copy('button-outline-sm-disabled', {
					x: 120,
					y: 200,
					children: [build.text('Cancel')],
				}),
				build.copy('button-default', { x: 0, y: 205, children: [build.text('Save')] }),
				build.copy('card-header', { y: 0, children: [build.text('Notifications')] }),
				build.group('Hidden note', [build.copy('badge-default', { children: [] })], {
					hidden: true,
				}),
			],
			{ x: 0, y: 0, width: 400, height: 300 }
		)
		const loose = build.copy('icon-trash-2', { x: 500, y: 0 })
		penpot.currentPage = { name: 'Account', root: build.board('Root', [loose, screen]) }

		const result = readLinks(penpot)

		expect(result).toMatchObject({ file: 'Page design', page: 'Account' })
		const exportOrText = (link: LinkNode) =>
			link.kind === 'text' ? link.text : 'export' in link ? link.export : link.kind
		expect(
			result.layers.map(({ layer, links }) => ({ layer, links: links.map(exportOrText) }))
		).toStrictEqual([
			{ layer: 'Settings', links: ['CardHeader', 'Button', 'Button'] },
			{ layer: 'Trash2', links: ['Trash2Icon'] },
		])
		const [, save, cancel] = result.layers[0]?.links ?? []
		expect(save).toMatchObject({ props: { disabled: { value: false } } })
		expect(cancel).toMatchObject({ props: { disabled: { value: true } } })
	})

	it('should fail loudly when no page is open', () => {
		const { penpot } = fakePenpot()

		expect(() => readLinks(penpot)).toThrow('read-links: no file or page is open')
	})
})
