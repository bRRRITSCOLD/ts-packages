import type { Inspection } from './inspection.js'

/**
 * What the plugin's main code sends the iframe UI through `penpot.ui.sendMessage`: an
 * inspection of the selected layer, or why there is nothing to show.
 */
export type InspectorMessage =
	| { type: 'inspection'; inspection: Inspection }
	| { type: 'nothing'; reason: string }

/** What the iframe UI sends the main code once it is listening, so the first message isn't lost. */
export type UiMessage = { type: 'ready' }
