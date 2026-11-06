// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { InspectorMessage } from '../../src/messages.js'
import { mountInspector, renderMessage } from '../../src/ui/inspector.js'

const inspection = (): Extract<InspectorMessage, { type: 'inspection' }> => ({
	type: 'inspection',
	inspection: {
		title: 'Button',
		kind: 'component',
		imports: ["import { Button } from '@brrritscold/core-react'"],
		jsx: '<Button disabled size="sm">Delete</Button>',
		props: [
			{ prop: 'disabled', value: 'true', source: 'exceptions-record' },
			{ prop: 'size', value: '"sm"', source: 'convention' },
		],
		unresolved: ["Button: `state` = `Hover` isn't in the value map for `disabled`"],
	},
})

const byTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`)

describe('link inspector UI', () => {
	afterEach(() => {
		document.body.innerHTML = ''
		window.history.replaceState(null, '', '/')
	})

	it('should render the import, JSX, prop sources and unresolved markers', () => {
		const root = document.createElement('main')
		document.body.append(root)

		renderMessage(root, inspection())

		expect(byTestId('title')?.textContent).toBe('Button')
		expect(byTestId('imports')?.querySelector('pre')?.textContent).toBe(
			"import { Button } from '@brrritscold/core-react'"
		)
		expect(byTestId('jsx')?.querySelector('pre')?.textContent).toBe(
			'<Button disabled size="sm">Delete</Button>'
		)
		expect(
			[...(byTestId('prop-disabled')?.children ?? [])].map((cell) => cell.textContent)
		).toStrictEqual(['disabled', 'true', 'exceptions record'])
		expect(byTestId('prop-size')?.lastElementChild?.textContent).toBe('naming')
		expect(byTestId('unresolved')?.querySelectorAll('li')).toHaveLength(1)
	})

	it('should leave out the sections an inspection has nothing for', () => {
		const root = document.createElement('main')
		document.body.append(root)
		const message = inspection()
		message.inspection = { ...message.inspection, imports: [], props: [], unresolved: [] }

		renderMessage(root, message)

		expect(byTestId('imports')).toBeNull()
		expect(byTestId('props')).toBeNull()
		expect(byTestId('unresolved')).toBeNull()
	})

	it('should render layer names as text, never as HTML', () => {
		const root = document.createElement('main')
		document.body.append(root)

		renderMessage(root, {
			type: 'nothing',
			reason: "`<img src=x onerror=alert(1)>` isn't an instance.",
		})

		expect(root.querySelector('img')).toBeNull()
		expect(byTestId('nothing')?.textContent).toContain('<img')
	})

	it('should render what the main code sends, apply the theme and say it is ready', () => {
		window.history.replaceState(null, '', '/link-inspector/ui.html?theme=dark')
		document.body.innerHTML = '<main id="app"></main>'
		const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})

		mountInspector(window)
		window.dispatchEvent(new MessageEvent('message', { data: inspection() }))
		window.dispatchEvent(new MessageEvent('message', { data: { type: 'unrelated' } }))

		expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'ready' }, '*')
		expect(document.body.dataset.theme).toBe('dark')
		expect(
			document.getElementById('app')?.querySelector('[data-testid="title"]')?.textContent
		).toBe('Button')
		postMessage.mockRestore()
	})
})
