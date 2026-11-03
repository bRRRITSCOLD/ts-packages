import { expect } from 'chai'
// application/testee
import { hashQuery } from '../../src/query.js'

// Pinned output of the hand-written compileEntryFilter / hashEntryQuery this
// module replaces. Cursors issued before the switch carry these hashes, so they
// must not change.
const legacy = {
	strings: {
		compiled: { event: { $in: ['b', 'a'] }, correlationId: { $nin: ['x'] } },
		hashNoSearch: 'T_Yl4f9JDSBuyoYGNd8zDwIK-OhAZ580UYWbtW_n5Eg',
		hashSearch: 'zcmq9kRimsnywUTG0HIpl0Nr3uP52IJrQ4dItpZY72A',
		hashGroup: 'CFRint7KlKygqqddCF2sdfFMt7pk9YIsqmiVGrTgIfY',
		hashSearchGroup: '1nkUDNWb3aLn6RLW7zDkDCCE8Z8jPIN-61VOTnIBBgI',
	},
	timestamp: {
		compiled: {
			timestamp: {
				$gte: new Date('2026-01-01T00:00:00Z'),
				$lte: new Date('2026-01-31T23:59:59.999Z'),
			},
			applicationId: { $in: ['app'] },
		},
		hashNoSearch: 'SUP999g3bPoJb8zODSzf-ketFyNuTHDTSz3mibT2rR4',
		hashSearch: 'ejdiLwB591AheUpxlpVwWYuYHDGswpMMaJAnk05-JGg',
		hashGroup: 'TuPAr1wl7oYUcoM7s0Xp0tFvly33PF4Z4FVbxknNsrw',
		hashSearchGroup: '59GSXA9WMUWaMgHwyPOHLVq8c4fq_tR2pPjEM52G4Ps',
	},
	empty: {
		compiled: {},
		hashNoSearch: 'edv80c-yBS-CEXKNa-oqtMHHnun2kqY1Ifq2BnGncmc',
		hashSearch: 'sKQySopIEDrMdlKpWHRuzYLfV3S7K_N2xCsdalfYzfo',
		hashGroup: 'z_fQktoAafbaIZ8EcLGwS5DMFd3DeKPlZtcrgPZUgfs',
		hashSearchGroup: 'k34Rwr7tlDu3EDQ9Hhp9vhaNXUEI7KyPMYOi5PydBuM',
	},
}

const group = { by: 'correlationId', accumulators: { count: { op: 'count' } } }

describe('query.ts', () => {
	describe('hashQuery', () => {
		for (const [name, pinned] of Object.entries(legacy)) {
			it(`should hash the legacy ${name} filter byte for byte as hashEntryQuery did`, () => {
				expect(hashQuery(pinned.compiled, { search: null })).to.eq(pinned.hashNoSearch)
				expect(hashQuery(pinned.compiled, { search: 'needle' })).to.eq(pinned.hashSearch)
				expect(hashQuery(pinned.compiled, { search: null, group })).to.eq(pinned.hashGroup)
				expect(hashQuery(pinned.compiled, { search: 'needle', group })).to.eq(
					pinned.hashSearchGroup
				)
			})
		}

		it('should not count field order or value order as a change', () => {
			expect(hashQuery({ event: { $in: ['a', 'b'] }, actor: { $in: ['x'] } })).to.eq(
				hashQuery({ actor: { $in: ['x'] }, event: { $in: ['b', 'a'] } })
			)
		})

		it('should not count key order inside a listed object as a change', () => {
			expect(hashQuery({ $or: [{ b: 1, a: 2 }, { c: 3 }] })).to.eq(
				hashQuery({ $or: [{ c: 3 }, { a: 2, b: 1 }] })
			)
			expect(hashQuery({}, { g: [{ b: 1, a: 2 }] })).to.eq(
				hashQuery({}, { g: [{ a: 2, b: 1 }] })
			)
		})

		it('should count list order in an extra as a change', () => {
			expect(hashQuery({}, { order: ['x', 'y'] })).to.not.eq(
				hashQuery({}, { order: ['y', 'x'] })
			)
		})

		it('should count a changed filter or extra as a change', () => {
			const compiled = { event: { $in: ['a'] } }
			expect(hashQuery(compiled)).to.not.eq(hashQuery({ event: { $in: ['b'] } }))
			expect(hashQuery(compiled, { search: null })).to.not.eq(hashQuery(compiled))
			expect(hashQuery(compiled, { search: 'a' })).to.not.eq(
				hashQuery(compiled, { search: 'b' })
			)
		})

		it('should leave out an undefined extra', () => {
			expect(hashQuery({}, { search: null, group: undefined })).to.eq(
				legacy.empty.hashNoSearch
			)
		})
	})
})
