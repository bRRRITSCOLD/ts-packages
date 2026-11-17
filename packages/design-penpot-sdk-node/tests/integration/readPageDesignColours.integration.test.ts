// node_modules
import { findStaleColours } from '@brrritscold/design-core-js/stale-colours'
import { clearInterceptors } from '@brrritscold/testing-core-node/nock'
import nock from 'nock'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

// testee
import { normalizePageDesignColours, readPageDesignColours } from '../../src/stale-colours.js'
// fixtures
import { getFileBody, loadRecording, type Recording } from '../__recordings__/recordings.js'
// utils
import { accessToken, penpotUrl, replay } from './__utils__/utils.js'

const read = (recording: Recording) =>
	readPageDesignColours({
		baseUrl: penpotUrl(),
		accessToken: accessToken(),
		fileId: recording.fileId,
	})

/** The fixture recording with its `Mode/Dark` theme active, but every stored colour still Light. */
const darkRecording = (): Recording => {
	const recording = loadRecording('snapshot-fixture')
	const body = getFileBody(recording) as { data: { tokensLib: Record<string, unknown> } }
	body.data.tokensLib.$metadata = {
		tokenSetOrder: ['primitive', 'light', 'dark'],
		activeThemes: ['Mode/Dark'],
		activeSets: ['primitive', 'dark'],
	}
	return recording
}

describe('readPageDesignColours (replaying recorded Penpot 2.18.6 answers)', () => {
	beforeAll(() => {
		nock.disableNetConnect()
	})

	afterEach(() => {
		clearInterceptors()
	})

	afterAll(() => {
		nock.enableNetConnect()
	})

	it('should read the fixture file, which stores its active theme’s colours, as clean', async () => {
		const recording = loadRecording('snapshot-fixture')
		const scopes = replay(recording)

		const colours = await read(recording)

		expect(scopes.every((scope) => scope.isDone())).toBe(true)
		expect(colours).toEqual(normalizePageDesignColours(getFileBody(recording)))
		expect(findStaleColours(colours)).toMatchObject({
			activeThemes: ['Mode/Light'],
			checked: 9,
			stale: [],
		})
	})

	it('should find the Light colours a Dark file stores, copies and page-local layers alike', async () => {
		const recording = darkRecording()
		replay(recording)

		const { stale, fixTheme } = findStaleColours(await read(recording))

		expect(fixTheme).toEqual({ group: 'Mode', active: 'Dark', other: 'Light' })
		// Every token-applied colour but the primitive on the Header copy and its main.
		expect(stale).toHaveLength(7)
		expect(
			stale.find(({ layerName, attribute }) => layerName === 'Card' && attribute === 'fill')
		).toMatchObject({
			token: 'background',
			expected: { hex: '#0a0a0a', opacity: 1 },
			found: { hex: '#ffffff', opacity: 1 },
		})
	})

	it('should throw, naming both versions, when Penpot runs another version', async () => {
		const recording = loadRecording('snapshot-fixture')
		recording.interactions[0].responseText = '2.19.0\n'
		replay(recording)

		await expect(read(recording)).rejects.toThrow(/runs 2\.19\.0.*pinned to 2\.18\.6/)
	})
})
