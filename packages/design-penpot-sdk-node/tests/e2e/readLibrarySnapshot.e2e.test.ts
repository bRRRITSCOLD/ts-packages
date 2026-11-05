// Opt-in, never in hosted CI: reads the live Penpot as the automation profile. Needs PENPOT_URL
// and SNAPSHOT_REFRESH_PENPOT_TOKEN in the process env, never from a repo .env file.

// node_modules
import { librarySnapshotSchema } from '@brrritscold/design-core-js/library-snapshot'
import { beforeAll, describe, expect, it } from 'vitest'

// testee
import { normalizeLibrarySnapshot, readLibrarySnapshot } from '../../src/library-snapshot.js'
// fixtures
import { getFileBody, loadRecording, type Recording } from '../__recordings__/recordings.js'

const requireEnv = (name: string): string => {
	const value = process.env[name]
	if (!value) throw new Error(`${name} is not set; the e2e tier reads it from the process env`)
	return value
}

describe('readLibrarySnapshot against the live Penpot', () => {
	let read: (recording: Recording) => ReturnType<typeof readLibrarySnapshot>

	beforeAll(() => {
		const baseUrl = requireEnv('PENPOT_URL')
		const accessToken = requireEnv('SNAPSHOT_REFRESH_PENPOT_TOKEN')
		read = ({ fileId }) => readLibrarySnapshot({ baseUrl, accessToken, fileId })
	})

	it('should still read the fixture file as its committed recording does', async () => {
		const recording = loadRecording('snapshot-fixture')

		// A difference means the recording is stale: re-record with `pnpm record:penpot`.
		expect(await read(recording)).toEqual(normalizeLibrarySnapshot(getFileBody(recording)))
	})

	it('should read the design system library into a schema-valid snapshot', async () => {
		const recording = loadRecording('design-system-library')

		const snapshot = await read(recording)

		expect(librarySnapshotSchema.parse(snapshot)).toEqual(snapshot)
		expect(snapshot.libraryFileId).toBe(recording.fileId)
	})
})
