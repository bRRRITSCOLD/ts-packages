// node_modules
import { describe, expect, it } from 'vitest'

// testee
import { readSnapshotRefreshConfig, SNAPSHOT_REFRESH_DEFAULTS } from '../../src/snapshot-refresh.js'

const required = {
	PENPOT_URL: 'http://penpot.invalid',
	SNAPSHOT_REFRESH_PENPOT_TOKEN: 'penpot-token',
	SNAPSHOT_REFRESH_GITHUB_TOKEN: 'github-token',
}

describe('readSnapshotRefreshConfig', () => {
	it('should fill the optional variables with their defaults', () => {
		expect(readSnapshotRefreshConfig(required)).toEqual({
			penpotUrl: required.PENPOT_URL,
			penpotToken: required.SNAPSHOT_REFRESH_PENPOT_TOKEN,
			githubToken: required.SNAPSHOT_REFRESH_GITHUB_TOKEN,
			libraryFileId: SNAPSHOT_REFRESH_DEFAULTS.SNAPSHOT_REFRESH_LIBRARY_FILE_ID,
			githubRepo: 'bRRRITSCOLD/ts-packages',
			baseBranch: 'main',
		})
	})

	it('should take the optional variables when set', () => {
		expect(
			readSnapshotRefreshConfig({
				...required,
				SNAPSHOT_REFRESH_LIBRARY_FILE_ID: 'file-id',
				SNAPSHOT_REFRESH_GITHUB_REPO: 'someone/fork',
				SNAPSHOT_REFRESH_BASE_BRANCH: 'next',
			})
		).toMatchObject({
			libraryFileId: 'file-id',
			githubRepo: 'someone/fork',
			baseBranch: 'next',
		})
	})

	it.each(Object.keys(required))('should throw naming %s when it is missing', (name) => {
		expect(() => readSnapshotRefreshConfig({ ...required, [name]: undefined })).toThrow(
			`Missing required environment variable(s): ${name}`
		)
	})

	it('should treat an empty variable as missing', () => {
		expect(() => readSnapshotRefreshConfig({ ...required, PENPOT_URL: '' })).toThrow(
			/PENPOT_URL/
		)
	})

	it('should not need the GitHub token when it is optional', () => {
		const { SNAPSHOT_REFRESH_GITHUB_TOKEN: _, ...penpotOnly } = required

		expect(readSnapshotRefreshConfig(penpotOnly, { githubToken: 'optional' })).toMatchObject({
			penpotUrl: required.PENPOT_URL,
		})
	})
})
