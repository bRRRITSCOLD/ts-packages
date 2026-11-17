// node_modules
import { clearInterceptors } from '@brrritscold/testing-core-node/nock'
import nock from 'nock'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

// testee
import { runStaleColoursCli, type StaleColoursCliIo } from '../../src/stale-colours.js'
// fixtures
import { getFileBody, loadRecording } from '../__recordings__/recordings.js'
// utils
import { replay } from './__utils__/utils.js'

const createIo = (env: Record<string, string | undefined>) => {
	const io = {
		env,
		stdout: vi.fn<StaleColoursCliIo['stdout']>(),
		stderr: vi.fn<StaleColoursCliIo['stderr']>(),
		fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
	}
	return { ...io, output: () => io.stdout.mock.calls.map(([line]) => line) }
}

const penpotEnv = () => ({
	PENPOT_URL: process.env.PENPOT_URL,
	SNAPSHOT_REFRESH_PENPOT_TOKEN: process.env.SNAPSHOT_REFRESH_PENPOT_TOKEN,
})

describe('runStaleColoursCli', () => {
	beforeAll(() => {
		nock.disableNetConnect()
	})

	afterEach(() => {
		clearInterceptors()
	})

	afterAll(() => {
		nock.enableNetConnect()
	})

	it('should report a clean file and exit 0', async () => {
		const recording = loadRecording('snapshot-fixture')
		const scopes = replay(recording)
		const io = createIo(penpotEnv())

		expect(await runStaleColoursCli(['--file', recording.fileId], io)).toBe(0)
		expect(scopes.every((scope) => scope.isDone())).toBe(true)
		expect(io.output()).toEqual([
			`snapshot-fixture (${recording.fileId}): active theme Mode/Light; 9 token colours checked, 0 stale.`,
		])
	})

	it('should report stale colours with the theme toggle that fixes them and exit 1', async () => {
		const recording = loadRecording('snapshot-fixture')
		const body = getFileBody(recording) as { data: { tokensLib: Record<string, unknown> } }
		body.data.tokensLib.$metadata = {
			tokenSetOrder: ['primitive', 'light', 'dark'],
			activeThemes: ['Mode/Dark'],
			activeSets: ['primitive', 'dark'],
		}
		replay(recording)
		const io = createIo(penpotEnv())

		expect(await runStaleColoursCli(['--file', recording.fileId], io)).toBe(1)
		expect(io.output()[0]).toBe(
			`snapshot-fixture (${recording.fileId}): active theme Mode/Dark; 9 token colours checked, 7 stale.`
		)
		expect(io.output().at(-1)).toBe(
			"Toggle the file's Mode theme to Light and back to Dark in Penpot (Tokens → Themes); then re-run."
		)
	})

	it('should fail with exit 2, naming every missing variable, before any request', async () => {
		const io = createIo({})

		expect(await runStaleColoursCli(['--file', 'some-file'], io)).toBe(2)
		expect(io.stderr).toHaveBeenCalledWith(
			'design-stale-colours failed: Missing required environment variable(s): PENPOT_URL, SNAPSHOT_REFRESH_PENPOT_TOKEN'
		)
	})

	it('should fail with exit 2 and the usage without --file', async () => {
		const io = createIo(penpotEnv())

		expect(await runStaleColoursCli([], io)).toBe(2)
		expect(io.stderr).toHaveBeenCalledWith(expect.stringMatching(/Missing --file/))
		expect(io.stderr).toHaveBeenCalledWith(
			expect.stringMatching(/^Usage: design-stale-colours/)
		)
	})

	it('should fail with exit 2 when Penpot refuses the request (403)', async () => {
		const recording = loadRecording('snapshot-fixture')
		recording.interactions[1].status = 403
		recording.interactions[1].responseBody = { type: 'authorization', code: 'object-not-found' }
		replay(recording)
		const io = createIo(penpotEnv())

		expect(await runStaleColoursCli(['--file', recording.fileId], io)).toBe(2)
		expect(io.stderr).toHaveBeenCalledWith(expect.stringMatching(/get-file failed \(403\)/))
	})
})
