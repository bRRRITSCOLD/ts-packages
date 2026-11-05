// node_modules
import { clearInterceptors, intercept } from '@brrritscold/testing-core-node/nock'
import nock from 'nock'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

// testee
import { normalizeLibrarySnapshot } from '../../src/library-snapshot.js'
import {
	readSnapshotRefreshConfig,
	refreshLibrarySnapshot,
	serializeLibrarySnapshot,
} from '../../src/snapshot-refresh.js'
// fixtures
import { getFileBody, loadRecording } from '../__recordings__/recordings.js'
import {
	BASE,
	commitSnapshot,
	createPull,
	listOpenPulls,
	OPEN_PULL,
	REPO,
	readSnapshot,
	STALE_SNAPSHOT,
} from './__fixtures__/refreshLibrarySnapshot.integration.fixtures.js'
// utils
import { replay } from './__utils__/utils.js'

const recording = loadRecording('snapshot-fixture')
/** What the refresh writes for the replayed fixture library. */
const snapshot = serializeLibrarySnapshot(normalizeLibrarySnapshot(getFileBody(recording)))

const refresh = () => {
	const lines: string[] = []
	const result = refreshLibrarySnapshot({
		...readSnapshotRefreshConfig({
			...process.env,
			SNAPSHOT_REFRESH_LIBRARY_FILE_ID: recording.fileId,
			SNAPSHOT_REFRESH_GITHUB_REPO: REPO,
			SNAPSHOT_REFRESH_BASE_BRANCH: BASE,
		}),
		log: (line) => lines.push(line),
	})
	return { result, lines }
}

/** Replays Penpot and GitHub; any request with no interceptor fails, so extra calls throw. */
const serve = (...github: Parameters<typeof intercept>[0]) => [
	...replay(recording),
	...intercept(github),
]

describe('refreshLibrarySnapshot (Penpot recordings and GitHub replayed by nock)', () => {
	beforeAll(() => {
		nock.disableNetConnect()
	})

	afterEach(() => {
		clearInterceptors()
	})

	afterAll(() => {
		nock.enableNetConnect()
	})

	it('should open no PR, and touch no branch, when the snapshot is unchanged', async () => {
		const scopes = serve(readSnapshot(BASE, snapshot))
		const { result, lines } = refresh()

		await expect(result).resolves.toEqual({ outcome: 'unchanged' })
		expect(scopes.every((scope) => scope.isDone())).toBe(true)
		expect(lines).toEqual([`Library snapshot unchanged from ${REPO}@${BASE}; no PR opened.`])
	})

	it('should commit the snapshot and open one PR when it changed and no refresh PR is open', async () => {
		const scopes = serve(
			readSnapshot(BASE, STALE_SNAPSHOT),
			listOpenPulls(null),
			...commitSnapshot(snapshot, false),
			createPull()
		)
		const { result, lines } = refresh()

		await expect(result).resolves.toEqual({
			outcome: 'opened',
			pullRequest: { number: 72, url: `https://github.com/${REPO}/pull/72` },
		})
		expect(scopes.every((scope) => scope.isDone())).toBe(true)
		expect(lines[0]).toMatch(/opened refresh PR #72/)
	})

	it('should open the first PR when the base branch has no snapshot yet', async () => {
		const scopes = serve(
			readSnapshot(BASE, null),
			listOpenPulls(null),
			...commitSnapshot(snapshot, false),
			createPull()
		)

		await expect(refresh().result).resolves.toMatchObject({ outcome: 'opened' })
		expect(scopes.every((scope) => scope.isDone())).toBe(true)
	})

	it('should force-move a leftover refresh branch when no refresh PR is open', async () => {
		const scopes = serve(
			readSnapshot(BASE, STALE_SNAPSHOT),
			listOpenPulls(null),
			...commitSnapshot(snapshot, true),
			createPull()
		)

		await expect(refresh().result).resolves.toMatchObject({ outcome: 'opened' })
		expect(scopes.every((scope) => scope.isDone())).toBe(true)
	})

	it('should update the open refresh PR’s branch instead of opening a second PR', async () => {
		// No createPull interceptor: a second PR would fail the run.
		const scopes = serve(
			readSnapshot(BASE, STALE_SNAPSHOT),
			listOpenPulls(OPEN_PULL),
			readSnapshot('design/snapshot-refresh', STALE_SNAPSHOT),
			...commitSnapshot(snapshot, true)
		)
		const { result, lines } = refresh()

		await expect(result).resolves.toEqual({
			outcome: 'updated',
			pullRequest: { number: OPEN_PULL.number, url: OPEN_PULL.html_url },
		})
		expect(scopes.every((scope) => scope.isDone())).toBe(true)
		expect(lines[0]).toMatch(/updated refresh PR #71/)
	})

	it('should push nothing when the open refresh PR already holds the snapshot', async () => {
		const scopes = serve(
			readSnapshot(BASE, STALE_SNAPSHOT),
			listOpenPulls(OPEN_PULL),
			readSnapshot('design/snapshot-refresh', snapshot)
		)

		await expect(refresh().result).resolves.toMatchObject({ outcome: 'up-to-date' })
		expect(scopes.every((scope) => scope.isDone())).toBe(true)
	})

	it('should throw, naming the call, when GitHub refuses the token (401)', async () => {
		replay(recording)
		intercept([
			{
				method: 'get',
				url: 'https://api.github.com',
				endpoint:
					'/repos/bRRRITSCOLD/ts-packages/contents/packages/core-react/design/library.snapshot.json',
				query: { ref: BASE },
				reply: { statusCode: 401, body: { message: 'Bad credentials' } },
			},
		])

		await expect(refresh().result).rejects.toThrow(
			/GitHub GET \/repos\/bRRRITSCOLD\/ts-packages\/contents\/.* failed \(401\): .*Bad credentials/
		)
	})
})
