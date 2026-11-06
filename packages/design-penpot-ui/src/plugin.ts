import type { PenpotShape } from './adapter.js'
import { readSelection } from './adapter.js'
import { inspect } from './inspection.js'
import type { InspectorMessage, UiMessage } from './messages.js'

/**
 * The read-only slice of the plugin `penpot` global the link inspector uses. It holds no write
 * method: the inspector shows the component link and never edits it.
 */
export type InspectorPenpot = {
	readonly selection: readonly PenpotShape[]
	readonly currentFile: { readonly id: string } | null
	readonly theme: string
	on(type: 'selectionchange', callback: () => void): unknown
	ui: {
		open(name: string, url: string, options?: { width: number; height: number }): void
		sendMessage(message: InspectorMessage): void
		onMessage<T>(callback: (message: T) => void): void
	}
}

/** Where the iframe UI is served, from the root of the static host (see the side image). */
export const UI_URL = '/link-inspector/ui.html'

/** The message for the current selection: an inspection, or why there is none. */
export const messageFor = (penpot: InspectorPenpot): InspectorMessage => {
	if (penpot.selection.length !== 1)
		return { type: 'nothing', reason: 'Select one library component or instance.' }
	const [shape] = penpot.selection
	const node = readSelection(shape, { currentFileId: penpot.currentFile?.id ?? '' })
	if (!node)
		return {
			type: 'nothing',
			reason: `\`${shape.name}\` isn't a library component or an instance.`,
		}
	return { type: 'inspection', inspection: inspect(node) }
}

/**
 * Starts the link inspector: opens the iframe UI and sends it an inspection of the selection
 * once it is ready and on every selection change.
 */
export const startLinkInspector = (penpot: InspectorPenpot): void => {
	const send = () => penpot.ui.sendMessage(messageFor(penpot))
	penpot.ui.onMessage<UiMessage>((message) => {
		if (message?.type === 'ready') send()
	})
	penpot.on('selectionchange', send)
	penpot.ui.open('Link inspector', `${UI_URL}?theme=${encodeURIComponent(penpot.theme)}`, {
		width: 360,
		height: 560,
	})
}
