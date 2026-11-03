import { HttpException } from '@brrritscold/core-js/error'
import { expect } from 'chai'
import { ObjectId } from 'mongodb'
// application/testee
import { MongoQueryDialect } from '../../../src/query/mongodb.js'

// An entries collection's fields, as a consumer declares them on the kit
const entryFields = {
	timestamp: { type: 'date', filter: true, sort: true },
	applicationId: { type: 'string', filter: true, sort: true },
	event: { type: 'string', filter: true, sort: true },
	actor: { type: 'string', filter: true, sort: true },
	correlationId: { type: 'string', filter: true },
} as const

// a job scheduler's fields
const jobFields = {
	nextRunAt: { type: 'date', nullable: true, filter: ['gte', 'lte'], sort: true },
	name: { type: 'string', filter: true, sort: true },
	disabled: { type: 'boolean', filter: true },
} as const

// Pinned output of the hand-written compileEntryFilter this module replaces,
// for the same filters
const legacy = {
	strings: {
		filter: { event: { in: ['b', 'a'] }, correlationId: { notIn: ['x'] }, actor: {} },
		compiled: { event: { $in: ['b', 'a'] }, correlationId: { $nin: ['x'] } },
	},
	timestamp: {
		filter: {
			timestamp: {
				gte: new Date('2026-01-01T00:00:00Z'),
				lte: new Date('2026-01-31T23:59:59.999Z'),
			},
			applicationId: { in: ['app'] },
		},
		compiled: {
			timestamp: {
				$gte: new Date('2026-01-01T00:00:00Z'),
				$lte: new Date('2026-01-31T23:59:59.999Z'),
			},
			applicationId: { $in: ['app'] },
		},
	},
	empty: {
		filter: {},
		compiled: {},
	},
}

const lastId = '65a000000000000000000001'
const lastObjectId = new ObjectId(lastId)

const dialect = new MongoQueryDialect()

describe('query/mongodb.ts', () => {
	describe('compileFilter', () => {
		for (const [name, pinned] of Object.entries(legacy)) {
			it(`should compile the legacy ${name} filter exactly as the hand-written version did`, () => {
				expect(dialect.compileFilter(entryFields, pinned.filter)).to.deep.eq(
					pinned.compiled
				)
			})
		}

		it('should compile boolean eq, with a missing field counting as false', () => {
			expect(dialect.compileFilter(jobFields, { disabled: { eq: true } })).to.deep.eq({
				disabled: { $eq: true },
			})
			expect(dialect.compileFilter(jobFields, { disabled: { eq: false } })).to.deep.eq({
				disabled: { $ne: true },
			})
		})

		it('should compile a bound on a nullable date to a plain range', () => {
			const gte = new Date('2026-01-01T00:00:00Z')
			expect(dialect.compileFilter(jobFields, { nextRunAt: { gte } })).to.deep.eq({
				nextRunAt: { $gte: gte },
			})
		})

		// core-js only has date bounds today, so the cast stands in for a future numeric field
		it('should keep a falsy bound rather than drop it', () => {
			const zero = 0 as unknown as Date
			expect(
				dialect.compileFilter(jobFields, { nextRunAt: { gte: zero, lte: zero } })
			).to.deep.eq({
				nextRunAt: { $gte: 0, $lte: 0 },
			})
		})

		// core-js rejects a null bound today; $gte: null would match only null and missing values
		it('should treat a null bound as no bound', () => {
			const none = null as unknown as Date
			expect(
				dialect.compileFilter(jobFields, { nextRunAt: { gte: none, lte: none } })
			).to.deep.eq({})
		})

		it('should leave out a field with no operator', () => {
			expect(dialect.compileFilter(jobFields, { name: {}, disabled: {} })).to.deep.eq({})
		})

		it('should compile in and notIn on one field to both operators', () => {
			expect(
				dialect.compileFilter(entryFields, { event: { in: ['a', 'b'], notIn: ['c'] } })
			).to.deep.eq({ event: { $in: ['a', 'b'], $nin: ['c'] } })
		})
	})

	describe('cursorFilter', () => {
		it('should resume a date sort exactly as the hand-written buildCursorFilter did', () => {
			const lastValue = '2026-01-01T00:00:00.000Z'
			expect(
				dialect.cursorFilter(entryFields, {
					sortKey: 'timestamp',
					sortBy: 'desc',
					lastValue,
					lastId,
				})
			).to.deep.eq({
				$or: [
					{ timestamp: { $lt: new Date(lastValue) } },
					{ timestamp: new Date(lastValue), _id: { $lt: lastObjectId } },
				],
			})
		})

		it('should resume a string sort exactly as the hand-written buildCursorFilter did', () => {
			expect(
				dialect.cursorFilter(entryFields, {
					sortKey: 'event',
					sortBy: 'asc',
					lastValue: 'e',
					lastId,
				})
			).to.deep.eq({
				$or: [{ event: { $gt: 'e' } }, { event: 'e', _id: { $gt: lastObjectId } }],
			})
		})

		// Diverges from the hand-written version, which compiled this to $lt: null and ended the walk
		it('should reject a null lastValue on a sort field not declared nullable with a 400', () => {
			expect(() =>
				dialect.cursorFilter(entryFields, {
					sortKey: 'event',
					sortBy: 'desc',
					lastValue: null,
					lastId,
				})
			)
				.to.throw(
					HttpException,
					'malformed cursor: event is not nullable, so lastValue cannot be null'
				)
				.with.property('statusCode', 400)
		})

		it('should cross the null block on a nullable date sort', () => {
			expect(
				dialect.cursorFilter(jobFields, {
					sortKey: 'nextRunAt',
					sortBy: 'asc',
					lastValue: null,
					lastId,
				})
			).to.deep.eq({
				$or: [
					{ nextRunAt: null, _id: { $gt: lastObjectId } },
					{ nextRunAt: { $ne: null } },
				],
			})
		})

		it('should reject a lastId that is not an ObjectId with a 400', () => {
			expect(() =>
				dialect.cursorFilter(entryFields, {
					sortKey: 'event',
					sortBy: 'asc',
					lastValue: 'e',
					lastId: 'nope',
				})
			)
				.to.throw(HttpException, 'malformed cursor: lastId is not a valid ObjectId "nope"')
				.with.property('statusCode', 400)
		})
	})

	describe('keysetFilter', () => {
		const date = new Date('2026-01-01T00:00:00Z')
		const id = lastObjectId

		it('should resume a nullable field after a value', () => {
			expect(
				dialect.keysetFilter({
					field: 'k',
					sortBy: 'asc',
					lastValue: date,
					lastId: id,
					nullable: true,
				})
			).to.deep.eq({ $or: [{ k: { $gt: date } }, { k: date, _id: { $gt: id } }] })
			expect(
				dialect.keysetFilter({
					field: 'k',
					sortBy: 'desc',
					lastValue: date,
					lastId: id,
					nullable: true,
				})
			).to.deep.eq({
				$or: [{ k: { $lt: date } }, { k: date, _id: { $lt: id } }, { k: null }],
			})
		})

		it('should resume a nullable field inside the null block', () => {
			expect(
				dialect.keysetFilter({
					field: 'k',
					sortBy: 'asc',
					lastValue: null,
					lastId: id,
					nullable: true,
				})
			).to.deep.eq({ $or: [{ k: null, _id: { $gt: id } }, { k: { $ne: null } }] })
			expect(
				dialect.keysetFilter({
					field: 'k',
					sortBy: 'desc',
					lastValue: null,
					lastId: id,
					nullable: true,
				})
			).to.deep.eq({ k: null, _id: { $lt: id } })
		})

		it('should compare only _id on a walk sorted by _id', () => {
			expect(
				dialect.keysetFilter({ field: '_id', sortBy: 'asc', lastValue: 'g', lastId: 'g' })
			).to.deep.eq({ _id: { $gt: 'g' } })
		})

		// Grouped reads page over $group rows, whose _id is the group key
		it('should resume grouped rows with the group key as the tiebreak', () => {
			expect(
				dialect.keysetFilter({
					field: 'count',
					sortBy: 'desc',
					lastValue: 5,
					lastId: 'app',
				})
			).to.deep.eq({ $or: [{ count: { $lt: 5 } }, { count: 5, _id: { $lt: 'app' } }] })
		})
	})

	describe('keysetSort', () => {
		it('should sort by the field, then _id, in one direction', () => {
			expect(dialect.keysetSort('name', 'asc')).to.deep.eq({ name: 1, _id: 1 })
			expect(dialect.keysetSort('name', 'desc')).to.deep.eq({ name: -1, _id: -1 })
		})
	})
})
