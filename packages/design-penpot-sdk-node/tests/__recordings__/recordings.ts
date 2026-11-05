/**
 * The committed `get-file` recordings: real Penpot answers captured by `record.ts`, pinned to the
 * Penpot version they came from. Tests replay them; nothing in them is written by hand.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { PENPOT_VERSION } from '../../src/rpc.js'

/** The design system library file (team "Design System"); the automation profile only views it. */
export const DESIGN_SYSTEM_LIBRARY_FILE_ID = 'de716cff-f170-81a2-8008-e63b04772bf6'

/** The fixture file `record.ts` keeps in the automation profile's own Drafts. */
export const FIXTURE_FILE_NAME = 'snapshot-fixture'

/** The recordings of the pinned Penpot version. */
export const RECORDINGS_DIR = fileURLToPath(new URL(`./penpot-${PENPOT_VERSION}/`, import.meta.url))

/** One request the client made and Penpot's answer, with no headers. */
export type RecordedInteraction = {
	method: 'GET' | 'POST'
	path: string
	requestBody?: unknown
	status: number
	responseBody?: unknown
	responseText?: string
}

/** One recording: the requests behind one `readLibrarySnapshot` call. */
export type Recording = {
	penpotVersion: string
	fileId: string
	interactions: RecordedInteraction[]
}

/** Where the recording named `name` lives. */
export const recordingPath = (name: string): string => `${RECORDINGS_DIR}get-file.${name}.json`

/** Loads a committed recording; each call returns a fresh copy, safe to mutate. */
export const loadRecording = (name: string): Recording =>
	JSON.parse(readFileSync(recordingPath(name), 'utf8'))

/** The recorded `get-file` answer of a recording. */
export const getFileBody = (recording: Recording): unknown => {
	const getFile = recording.interactions.find(({ path }) => path.endsWith('/get-file'))
	if (!getFile) throw new Error(`recording of ${recording.fileId} holds no get-file`)
	return getFile.responseBody
}
