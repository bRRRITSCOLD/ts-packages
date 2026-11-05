// node_modules
import { librarySnapshotSchema } from '@brrritscold/design-core-js/library-snapshot'
import { clearInterceptors } from '@brrritscold/testing-core-node/nock'
import nock from 'nock'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

// testee
import { normalizeLibrarySnapshot, readLibrarySnapshot } from '../../src/library-snapshot.js'
// fixtures
import { getFileBody, loadRecording, type Recording } from '../__recordings__/recordings.js'
// utils
import { accessToken, penpotUrl, replay } from './__utils__/utils.js'

const read = (recording: Recording) =>
	readLibrarySnapshot({
		baseUrl: penpotUrl(),
		accessToken: accessToken(),
		fileId: recording.fileId,
	})

describe('readLibrarySnapshot (replaying recorded Penpot 2.18.6 answers)', () => {
	beforeAll(() => {
		// A request with no recording fails instead of reaching a network.
		nock.disableNetConnect()
	})

	afterEach(() => {
		clearInterceptors()
	})

	afterAll(() => {
		nock.enableNetConnect()
	})

	it('should read the fixture library into a schema-valid snapshot', async () => {
		const recording = loadRecording('snapshot-fixture')
		const scopes = replay(recording)

		const snapshot = await read(recording)

		expect(scopes.every((scope) => scope.isDone())).toBe(true)
		expect(librarySnapshotSchema.parse(snapshot)).toEqual(snapshot)
		expect(snapshot).toEqual(normalizeLibrarySnapshot(getFileBody(recording)))
		expect(snapshot.libraryFileId).toBe(recording.fileId)
		expect(Object.keys(snapshot.components)).toHaveLength(7)
	})

	it('should read the design system library', async () => {
		const recording = loadRecording('design-system-library')
		replay(recording)

		const snapshot = await read(recording)

		expect(snapshot).toEqual({
			schemaVersion: 2,
			penpotVersion: '2.18.6',
			libraryFileId: recording.fileId,
			tokens: {},
			tokenThemes: [],
			components: {},
		})
	})

	it('should call get-file with only the file id, never features', async () => {
		const recording = loadRecording('snapshot-fixture')
		replay(recording)

		// The replay matches the recorded body exactly; a request with `features` finds no match.
		await expect(read(recording)).resolves.toBeDefined()
		expect(
			recording.interactions.find(({ path }) => path.endsWith('/get-file'))?.requestBody
		).toEqual({ id: recording.fileId })
	})

	it('should throw, naming both versions, when Penpot runs another version', async () => {
		const recording = loadRecording('snapshot-fixture')
		recording.interactions[0].responseText = '2.19.0\n'
		const [versionScope, getFileScope] = replay(recording)

		await expect(read(recording)).rejects.toThrow(/runs 2\.19\.0.*pinned to 2\.18\.6/)
		expect(versionScope.isDone()).toBe(true)
		expect(getFileScope.isDone()).toBe(false)
	})

	it('should throw, naming the command, when Penpot refuses the request (403)', async () => {
		const recording = loadRecording('snapshot-fixture')
		const getFile = recording.interactions[1]
		getFile.status = 403
		getFile.responseBody = { type: 'authorization', code: 'object-not-found' }
		replay(recording)

		await expect(read(recording)).rejects.toThrow(
			/get-file failed \(403\): authorization \/ object-not-found/
		)
	})

	it('should throw loudly when the recorded get-file changes shape', async () => {
		const recording = loadRecording('snapshot-fixture')
		const body = getFileBody(recording) as { data: Record<string, unknown> }
		body.data.componentsV3 = body.data.components
		body.data.pagesIndex = 'moved'
		replay(recording)

		await expect(read(recording)).rejects.toThrow(/Penpot get-file changed shape at get-file/)
	})
})
