import { afterEach, describe, expect, it, vi } from 'vitest'

import { fakePenpot } from '../fixtures/penpot.js'

/** Runs the plugin's main code the way Penpot does: the bundle entry with `penpot` global. */
const startPlugin = async (fake: ReturnType<typeof fakePenpot>) => {
	vi.stubGlobal('penpot', fake.penpot)
	vi.resetModules()
	await import('../../src/entries/plugin.js')
	return fake
}

describe('link inspector main code', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('should open the iframe UI from the static host with the Penpot theme', async () => {
		const { penpot } = await startPlugin(fakePenpot())

		expect(penpot.ui.open).toHaveBeenCalledExactlyOnceWith(
			'Link inspector',
			'/link-inspector/ui.html?theme=dark',
			{ width: 360, height: 560 }
		)
	})

	it('should send an inspection of the selection once the UI is ready', async () => {
		const fake = await startPlugin(fakePenpot())
		fake.penpot.selection = [
			fake.build.copy('badge-secondary', { children: [fake.build.text('Beta')] }),
		]

		fake.fromUi({ type: 'ready' })

		expect(fake.penpot.ui.sendMessage).toHaveBeenCalledExactlyOnceWith({
			type: 'inspection',
			inspection: expect.objectContaining({
				title: 'Badge',
				jsx: '<Badge variant="secondary">Beta</Badge>',
			}),
		})
	})

	it('should send a new inspection on every selection change', async () => {
		const fake = await startPlugin(fakePenpot())

		fake.select(fake.build.copy('icon-trash-2'))
		fake.select(fake.build.copy('badge-default', { children: [] }))

		expect(
			fake.penpot.ui.sendMessage.mock.calls.map(([message]) => message.inspection.title)
		).toStrictEqual(['Trash2Icon', 'Badge'])
	})

	it('should say why there is nothing to show for no selection, several, or a plain layer', async () => {
		const fake = await startPlugin(fakePenpot())
		const board = fake.build.board('Screen', [])

		fake.select()
		fake.select(board, fake.build.copy('icon-trash-2'))
		fake.select(board)

		expect(fake.penpot.ui.sendMessage.mock.calls.map(([message]) => message)).toStrictEqual([
			{ type: 'nothing', reason: 'Select one library component or instance.' },
			{ type: 'nothing', reason: 'Select one library component or instance.' },
			{ type: 'nothing', reason: "`Screen` isn't a library component or an instance." },
		])
	})

	it('should never write plugin data', async () => {
		const fake = await startPlugin(fakePenpot())

		fake.fromUi({ type: 'ready' })
		fake.select(fake.build.copy('card'))
		fake.select(fake.build.copy('button-outline-sm-disabled'))

		expect(fake.writes.setSharedPluginData).not.toHaveBeenCalled()
		expect(fake.writes.setPluginData).not.toHaveBeenCalled()
	})
})
