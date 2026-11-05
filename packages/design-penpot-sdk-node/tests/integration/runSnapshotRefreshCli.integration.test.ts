// node_modules
import { clearInterceptors } from '@brrritscold/testing-core-node/nock'
import nock from 'nock'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

// testee
import { normalizeLibrarySnapshot } from '../../src/library-snapshot.js'
import {
	runSnapshotRefreshCli,
	type SnapshotRefreshCliIo,
	serializeLibrarySnapshot,
} from '../../src/snapshot-refresh.js'
// fixtures
import { getFileBody, loadRecording } from '../__recordings__/recordings.js'
// utils
import { replay } from './__utils__/utils.js'

const recording = loadRecording('snapshot-fixture')

const createIo = (env: Record<string, string | undefined>) => ({
	env,
	stdout: vi.fn<SnapshotRefreshCliIo['stdout']>(),
	stderr: vi.fn<SnapshotRefreshCliIo['stderr']>(),
	writeFile: vi.fn<SnapshotRefreshCliIo['writeFile']>(),
	fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
})

describe('runSnapshotRefreshCli', () => {
	beforeAll(() => {
		nock.disableNetConnect()
	})

	afterEach(() => {
		clearInterceptors()
	})

	afterAll(() => {
		nock.enableNetConnect()
	})

	it('should fail naming every missing variable, before any request', async () => {
		const io = createIo({ PENPOT_URL: process.env.PENPOT_URL })

		expect(await runSnapshotRefreshCli([], io)).toBe(1)
		expect(io.stderr).toHaveBeenCalledWith(
			'design-snapshot-refresh failed: Missing required environment variable(s): SNAPSHOT_REFRESH_PENPOT_TOKEN, SNAPSHOT_REFRESH_GITHUB_TOKEN'
		)
	})

	it('should write the snapshot to --write without a GitHub token', async () => {
		const scopes = replay(recording)
		const io = createIo({
			PENPOT_URL: process.env.PENPOT_URL,
			SNAPSHOT_REFRESH_PENPOT_TOKEN: process.env.SNAPSHOT_REFRESH_PENPOT_TOKEN,
			SNAPSHOT_REFRESH_LIBRARY_FILE_ID: recording.fileId,
		})

		expect(await runSnapshotRefreshCli(['--write', 'library.snapshot.json'], io)).toBe(0)
		expect(scopes.every((scope) => scope.isDone())).toBe(true)
		expect(io.writeFile).toHaveBeenCalledWith(
			'library.snapshot.json',
			serializeLibrarySnapshot(normalizeLibrarySnapshot(getFileBody(recording)))
		)
	})

	it('should fail naming the option when given an unknown one', async () => {
		const io = createIo({})

		expect(await runSnapshotRefreshCli(['--dry-run'], io)).toBe(1)
		expect(io.stderr).toHaveBeenCalledWith(expect.stringMatching(/--dry-run/))
	})
})
