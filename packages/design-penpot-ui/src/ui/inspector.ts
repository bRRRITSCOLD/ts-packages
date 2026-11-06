import type { Inspection } from '../inspection.js'
import type { InspectorMessage, UiMessage } from '../messages.js'

const SOURCE_LABEL = { convention: 'naming', 'exceptions-record': 'exceptions record' } as const

/** `document.createElement` with a class, test id and text set; text only, never HTML. */
const element = <K extends keyof HTMLElementTagNameMap>(
	doc: Document,
	tag: K,
	options: { className?: string; testId?: string; text?: string } = {}
): HTMLElementTagNameMap[K] => {
	const node = doc.createElement(tag)
	if (options.className) node.className = options.className
	if (options.testId) node.dataset.testid = options.testId
	if (options.text !== undefined) node.textContent = options.text
	return node
}

const section = (doc: Document, heading: string, testId: string, body: HTMLElement) => {
	const wrapper = element(doc, 'section', { testId })
	wrapper.append(element(doc, 'h2', { text: heading }), body)
	return wrapper
}

const renderInspection = (doc: Document, inspection: Inspection): HTMLElement[] => {
	const nodes: HTMLElement[] = [element(doc, 'h1', { testId: 'title', text: inspection.title })]

	if (inspection.imports.length > 0)
		nodes.push(
			section(
				doc,
				'Import',
				'imports',
				element(doc, 'pre', { text: inspection.imports.join('\n') })
			)
		)
	nodes.push(section(doc, 'JSX', 'jsx', element(doc, 'pre', { text: inspection.jsx })))

	if (inspection.props.length > 0) {
		const table = element(doc, 'table')
		const head = element(doc, 'tr')
		for (const label of ['Prop', 'Value', 'From'])
			head.append(element(doc, 'th', { text: label }))
		table.append(head)
		for (const { prop, value, source } of inspection.props) {
			const row = element(doc, 'tr', { testId: `prop-${prop}` })
			row.append(
				element(doc, 'td', { text: prop }),
				element(doc, 'td', { text: value }),
				element(doc, 'td', { className: `source ${source}`, text: SOURCE_LABEL[source] })
			)
			table.append(row)
		}
		nodes.push(section(doc, 'Props', 'props', table))
	}

	if (inspection.unresolved.length > 0) {
		const list = element(doc, 'ul')
		for (const marker of inspection.unresolved)
			list.append(element(doc, 'li', { text: marker }))
		nodes.push(section(doc, 'Unresolved', 'unresolved', list))
	}
	return nodes
}

/** Replaces the contents of `root` with what a message from the main code says. */
export const renderMessage = (root: HTMLElement, message: InspectorMessage): void => {
	const doc = root.ownerDocument
	root.replaceChildren(
		...(message.type === 'inspection'
			? renderInspection(doc, message.inspection)
			: [
					element(doc, 'p', {
						className: 'nothing',
						testId: 'nothing',
						text: message.reason,
					}),
				])
	)
}

const isInspectorMessage = (data: unknown): data is InspectorMessage =>
	typeof data === 'object' &&
	data !== null &&
	((data as { type?: unknown }).type === 'inspection' ||
		(data as { type?: unknown }).type === 'nothing')

/**
 * Mounts the iframe UI: renders every message the main code sends into `#app`, applies the
 * `theme` query parameter, then tells the main code it is ready.
 */
export const mountInspector = (win: Window): void => {
	const doc = win.document
	const theme = new URLSearchParams(win.location.search).get('theme')
	if (theme) doc.body.dataset.theme = theme
	const root = doc.getElementById('app') ?? doc.body
	win.addEventListener('message', (event: MessageEvent) => {
		if (isInspectorMessage(event.data)) renderMessage(root, event.data)
	})
	const ready: UiMessage = { type: 'ready' }
	win.parent.postMessage(ready, '*')
}
