import { describe, expect, it } from 'vitest'

// testee
import { type LibraryLayer, librarySnapshotSchema } from '../../src/library-snapshot.js'
// fixtures
import {
	createInStepLibrary,
	createLibraryComponent,
	createLibraryLayer,
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
		const snapshot = { ...createLibrarySnapshot({}), schemaVersion: 1 }

		expect(librarySnapshotSchema.safeParse(snapshot).success).toBe(false)
	})

	it('should reject an applied token or unbound attribute the drift check does not check', () => {
		const layer = (overrides: Partial<LibraryLayer>) =>
			createLibrarySnapshot({
				card: createLibraryComponent({
					name: 'Card',
					layers: { board: createLibraryLayer(overrides) },
				}),
			})

		expect(
			librarySnapshotSchema.safeParse(
				layer({ appliedTokens: { width: 'size.sm' } as LibraryLayer['appliedTokens'] })
			).success
		).toBe(false)
		expect(
			librarySnapshotSchema.safeParse(layer({ unbound: ['rotation' as 'fill'] })).success
		).toBe(false)
	})

	it('should reject a token catalog entry that is neither a token nor a group', () => {
		const snapshot = createLibrarySnapshot({})
		;(snapshot.tokens.light as Record<string, unknown>).primary = { $value: '#000000' }

		expect(librarySnapshotSchema.safeParse(snapshot).success).toBe(false)
	})
})
