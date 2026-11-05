import { describe, expect, it } from 'vitest'

// testee
import { librarySnapshotSchema } from '../../src/library-snapshot.js'
// fixtures
import {
	createInStepLibrary,
	createLibrarySnapshot,
} from './__fixtures__/checkDrift.unit.fixtures.js'

describe('librarySnapshotSchema', () => {
	it('should accept a snapshot with a header and components keyed by Penpot component id', () => {
		const snapshot = createLibrarySnapshot(createInStepLibrary())

		expect(librarySnapshotSchema.parse(snapshot)).toEqual(snapshot)
	})

	it('should reject a key it does not know, so a format change fails loudly', () => {
		const snapshot = { ...createLibrarySnapshot({}), libraryVersion: '1.2.0' }

		expect(librarySnapshotSchema.safeParse(snapshot).success).toBe(false)
	})

	it('should reject another schema version', () => {
		const snapshot = { ...createLibrarySnapshot({}), schemaVersion: 2 }

		expect(librarySnapshotSchema.safeParse(snapshot).success).toBe(false)
	})
})
