// node_modules
import { describe, expect, it } from 'vitest'

// testee
import { normalizeLibrarySnapshot } from '../../src/library-snapshot.js'
import { serializeLibrarySnapshot } from '../../src/snapshot-refresh.js'
// fixtures
import { getFileBody, loadRecording } from '../__recordings__/recordings.js'

describe('serializeLibrarySnapshot', () => {
	it('should write tab-indented JSON ending in a newline', () => {
		const text = serializeLibrarySnapshot({
			schemaVersion: 2,
			penpotVersion: '2.18.6',
			libraryFileId: 'file-id',
			tokens: {},
			tokenThemes: [],
			components: {},
		})

		expect(text).toBe(
			'{\n\t"schemaVersion": 2,\n\t"penpotVersion": "2.18.6",\n\t"libraryFileId": "file-id",\n\t"tokens": {},\n\t"tokenThemes": [],\n\t"components": {}\n}\n'
		)
	})

	it('should give the same bytes for the same library on every read', () => {
		const read = () =>
			serializeLibrarySnapshot(
				normalizeLibrarySnapshot(getFileBody(loadRecording('snapshot-fixture')))
			)

		expect(read()).toBe(read())
		expect(JSON.parse(read())).toEqual(
			normalizeLibrarySnapshot(getFileBody(loadRecording('snapshot-fixture')))
		)
	})
})
