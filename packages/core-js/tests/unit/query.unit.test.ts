import { describe, expect, it } from 'vitest'
import { ExceptionFaults, HttpException } from '../../src/error.js'
// application/testee
import {
	createCursorCodec,
	cursorPayloadSchema,
	type Filter,
	filterSchema,
	MAX_FILTER_VALUES,
	pageSchema,
	querySchema,
	serializeCursorValue,
	sortSchema,
} from '../../src/query.js'
import { z } from '../../src/zod.js'

const fields = {
	timestamp: { type: 'date', filter: true, sort: true },
	event: { type: 'string', filter: true, sort: true },
	correlationId: { type: 'string', filter: true },
	nextRunAt: { type: 'date', nullable: true, filter: ['gte', 'lte'], sort: true },
	disabled: { type: 'boolean', filter: true },
	notes: { type: 'string' },
} as const

// How hand-built cursors were encoded before the codec, so those tokens still decode
const legacyToken = (payload: object) =>
	Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')

function catchError(fn: () => unknown): HttpException {
	try {
		fn()
	} catch (err) {
		return err as HttpException
	}
	throw new Error('expected a throw')
}

function expectBadRequest(fn: () => unknown, message: string) {
	const error = catchError(fn)
	expect(error).toBeInstanceOf(HttpException)
	expect(error.statusCode).toBe(400)
	expect(error.fault).toBe(ExceptionFaults.CLIENT)
	expect(error.message).toBe(message)
}

function issueMessages(schema: z.ZodType, value: unknown): string[] {
	const result = schema.safeParse(value)
	expect(result.success).toBe(false)
	return result.error?.issues.map((issue) => issue.message) ?? []
}

describe('query.ts', () => {
	describe('filterSchema', () => {
		const schema = filterSchema(fields)

		it('should default an omitted filter to {}', () => {
			expect(schema.parse(undefined)).toStrictEqual({})
		})

		it('should accept in and notIn on a string field', () => {
			const filter = { event: { in: ['a', 'b'] }, correlationId: { notIn: ['c'] } }
			expect(schema.parse(filter)).toStrictEqual(filter)
		})

		it('should reject in and notIn that overlap', () => {
			expect(issueMessages(schema, { event: { in: ['a'], notIn: ['a'] } })).toContain(
				'in and notIn must not overlap'
			)
		})

		it('should reject an empty or oversized value list', () => {
			expect(schema.safeParse({ event: { in: [] } }).success).toBe(false)
			const tooMany = Array.from({ length: MAX_FILTER_VALUES + 1 }, (_, i) => `v${i}`)
			expect(schema.safeParse({ event: { in: tooMany } }).success).toBe(false)
		})

		it('should parse date bounds to Dates', () => {
			const parsed = schema.parse({
				timestamp: { gte: '2026-01-01T00:00:00Z', lte: '2026-01-02T00:00:00+01:00' },
			})
			expect(parsed.timestamp?.gte).toStrictEqual(new Date('2026-01-01T00:00:00Z'))
			expect(parsed.timestamp?.lte).toStrictEqual(new Date('2026-01-01T23:00:00Z'))
		})

		it('should reject gte after lte', () => {
			expect(
				issueMessages(schema, {
					timestamp: { gte: '2026-01-02T00:00:00Z', lte: '2026-01-01T00:00:00Z' },
				})
			).toContain('gte must not be after lte')
		})

		it('should reject a date that is not an ISO date-time', () => {
			expect(schema.safeParse({ timestamp: { gte: '2026-01-01' } }).success).toBe(false)
		})

		it('should accept eq on a boolean field and nothing else', () => {
			expect(schema.parse({ disabled: { eq: false } })).toStrictEqual({
				disabled: { eq: false },
			})
			expect(schema.safeParse({ disabled: { in: ['true'] } }).success).toBe(false)
		})

		it('should allow only the listed operators when filter is a list', () => {
			const narrow = filterSchema({
				nextRunAt: { type: 'date', nullable: true, filter: ['gte'] },
			})
			expect(narrow.safeParse({ nextRunAt: { gte: '2026-01-01T00:00:00Z' } }).success).toBe(
				true
			)
			expect(narrow.safeParse({ nextRunAt: { lte: '2026-01-01T00:00:00Z' } }).success).toBe(
				false
			)
		})

		it('should type a filter with only the operators its spec allows', () => {
			const narrowFields = {
				nextRunAt: { type: 'date', nullable: true, filter: ['gte'] },
				event: { type: 'string', filter: true },
			} as const
			const allowed: Filter<typeof narrowFields> = {
				nextRunAt: { gte: new Date() },
				event: { in: ['a'], notIn: ['b'] },
			}
			// @ts-expect-error lte is not in nextRunAt's filter list
			const disallowed: Filter<typeof narrowFields> = { nextRunAt: { lte: new Date() } }
			expect(allowed).toBeTypeOf('object')
			expect(disallowed).toBeTypeOf('object')
		})

		it('should reject unknown fields, unfilterable fields and operators', () => {
			expect(schema.safeParse({ nope: { in: ['a'] } }).success).toBe(false)
			expect(schema.safeParse({ notes: { in: ['a'] } }).success).toBe(false)
			expect(schema.safeParse({ event: { $in: ['a'] } }).success).toBe(false)
		})
	})

	describe('sortSchema', () => {
		const schema = sortSchema({ fields, defaultKey: 'timestamp', defaultDirection: 'desc' })

		it('should default an omitted sort and its omitted members', () => {
			expect(schema.parse(undefined)).toStrictEqual({ key: 'timestamp', direction: 'desc' })
			expect(schema.parse({ key: 'event' })).toStrictEqual({
				key: 'event',
				direction: 'desc',
			})
		})

		it('should accept only sortable fields', () => {
			expect(schema.parse({ key: 'nextRunAt', direction: 'asc' })).toStrictEqual({
				key: 'nextRunAt',
				direction: 'asc',
			})
			expect(schema.safeParse({ key: 'correlationId' }).success).toBe(false)
			expect(schema.safeParse({ key: 'disabled' }).success).toBe(false)
		})
	})

	describe('pageSchema', () => {
		const schema = pageSchema({ defaultLimit: 50, maxLimit: 200 })

		it('should default an omitted page and limit', () => {
			expect(schema.parse(undefined)).toStrictEqual({ limit: 50 })
			expect(schema.parse({ cursor: 'abc' })).toStrictEqual({ limit: 50, cursor: 'abc' })
		})

		it('should cap the limit at maxLimit', () => {
			expect(schema.parse({ limit: 200 })).toStrictEqual({ limit: 200 })
			expect(schema.safeParse({ limit: 201 }).success).toBe(false)
			expect(schema.safeParse({ limit: 0 }).success).toBe(false)
		})
	})

	describe('querySchema', () => {
		const schema = querySchema({
			fields,
			sort: { defaultKey: 'timestamp', defaultDirection: 'desc' },
			page: { defaultLimit: 50, maxLimit: 200 },
		})

		it('should default an empty body to the whole envelope', () => {
			expect(schema.parse({})).toStrictEqual({
				filter: {},
				sort: { key: 'timestamp', direction: 'desc' },
				page: { limit: 50 },
			})
		})

		it('should reject unknown members unless extended', () => {
			expect(schema.safeParse({ search: 'x' }).success).toBe(false)
			const extended = schema.extend({ search: z.string().min(1).optional() })
			expect(extended.parse({ search: 'x' }).search).toBe('x')
		})
	})

	describe('createCursorCodec', () => {
		const codec = createCursorCodec({ fields })
		const payload = {
			sortKey: 'timestamp',
			sortBy: 'desc' as const,
			lastValue: '2026-01-01T00:00:00.000Z',
			lastId: '65a000000000000000000001',
			filterHash: 'hash',
		}

		it('should encode exactly as hand-built cursors did', () => {
			const withUnicode = { ...payload, lastValue: 'événement ✓', sortKey: 'event' }
			expect(codec.encode(payload)).toBe(legacyToken(payload))
			expect(codec.encode(withUnicode)).toBe(legacyToken(withUnicode))
			expect(codec.decode(legacyToken(withUnicode))).toStrictEqual(withUnicode)
		})

		it('should round-trip a payload', () => {
			expect(codec.decode(codec.encode(payload))).toStrictEqual(payload)
		})

		it('should encode a payload too large to spread into one call', () => {
			const large = { ...payload, sortKey: 'event', lastValue: 'x'.repeat(300_000) }
			expect(codec.encode(large)).toBe(legacyToken(large))
			expect(codec.decode(codec.encode(large))).toStrictEqual(large)
		})

		it('should reject a token that is not base64 JSON of an object', () => {
			expectBadRequest(
				() => codec.decode('not base64 json!'),
				'malformed cursor: invalid base64 or JSON payload'
			)
			expectBadRequest(
				() => codec.decode(Buffer.from('1').toString('base64')),
				'malformed cursor: payload is not an object'
			)
		})

		it('should reject a sortKey that is not sortable', () => {
			expectBadRequest(
				() => codec.decode(legacyToken({ ...payload, sortKey: 'correlationId' })),
				'malformed cursor: unknown sortKey "correlationId"'
			)
		})

		it('should name a malformed sortBy, lastId, lastValue or filterHash', () => {
			expectBadRequest(
				() => codec.decode(legacyToken({ ...payload, sortBy: 'up' })),
				'malformed cursor: invalid sortBy "up"'
			)
			expectBadRequest(
				() => codec.decode(legacyToken({ ...payload, lastId: 1 })),
				'malformed cursor: lastId must be a string'
			)
			expectBadRequest(
				() => codec.decode(legacyToken({ ...payload, sortKey: 'event', lastValue: {} })),
				'malformed cursor: lastValue must be string, number, or null'
			)
			expectBadRequest(
				() => codec.decode(legacyToken({ ...payload, filterHash: 1 })),
				'malformed cursor: filterHash must be a string'
			)
		})

		it('should check a date lastValue', () => {
			expectBadRequest(
				() => codec.decode(legacyToken({ ...payload, lastValue: 1 })),
				'malformed cursor: timestamp lastValue must be an ISO string (got number)'
			)
			expectBadRequest(
				() => codec.decode(legacyToken({ ...payload, lastValue: null })),
				'malformed cursor: timestamp lastValue must be an ISO string (got object)'
			)
			expectBadRequest(
				() => codec.decode(legacyToken({ ...payload, lastValue: 'yesterday' })),
				'malformed cursor: timestamp lastValue is not a valid date "yesterday"'
			)
		})

		it('should allow a null lastValue on a nullable date and a string field', () => {
			const inNullBlock = { ...payload, sortKey: 'nextRunAt', lastValue: null }
			expect(codec.parseLastValue(codec.decode(legacyToken(inNullBlock)))).toBe(null)

			const nullString = { ...payload, sortKey: 'event', lastValue: null }
			expect(codec.parseLastValue(codec.decode(legacyToken(nullString)))).toBe(null)
		})

		it('should parse a date lastValue to a Date and leave a string as it is', () => {
			expect(codec.parseLastValue(payload)).toStrictEqual(new Date(payload.lastValue))
			expect(codec.parseLastValue({ ...payload, sortKey: 'event', lastValue: 'x' })).toBe('x')
		})

		it('should decode fields an extended schema adds', () => {
			const schema = cursorPayloadSchema.extend({
				window: z.object({ gte: z.string(), lte: z.string() }).optional(),
			})
			const extended = createCursorCodec({ fields, schema })
			const window = { gte: '2026-01-01T00:00:00Z', lte: '2026-01-02T00:00:00Z' }
			expect(extended.decode(legacyToken({ ...payload, window })).window).toStrictEqual(
				window
			)
		})

		it('should resolve a cursor that continues the same read', () => {
			const cursor = codec.encode(payload)
			expect(
				codec.resolve({ cursor, sortKey: 'timestamp', sortBy: 'desc', filterHash: 'hash' })
			).toStrictEqual(payload)
		})

		it('should accept only a sortable sortKey on resolve', () => {
			const cursor = codec.encode(payload)
			const sortBy = 'desc'
			// @ts-expect-error correlationId is filterable but not sortable
			expect(() => codec.resolve({ cursor, sortKey: 'correlationId', sortBy })).toThrow()
			// @ts-expect-error typo is not a field
			expect(() => codec.resolve({ cursor, sortKey: 'typo', sortBy })).toThrow()
		})

		it('should reject a cursor sent with another sort or filter', () => {
			const cursor = codec.encode(payload)
			expectBadRequest(
				() => codec.resolve({ cursor, sortKey: 'event', sortBy: 'desc' }),
				'sort changed; restart pagination'
			)
			expectBadRequest(
				() => codec.resolve({ cursor, sortKey: 'timestamp', sortBy: 'asc' }),
				'sort changed; restart pagination'
			)
			expectBadRequest(
				() =>
					codec.resolve({
						cursor,
						sortKey: 'timestamp',
						sortBy: 'desc',
						filterHash: 'other',
					}),
				'filter changed; restart pagination'
			)
		})

		it('should not continue a filter with a cursor that has no hash', () => {
			const { filterHash: _, ...unhashed } = payload
			expectBadRequest(
				() =>
					codec.resolve({
						cursor: codec.encode(unhashed),
						sortKey: 'timestamp',
						sortBy: 'desc',
						filterHash: 'hash',
					}),
				'filter changed; restart pagination'
			)
		})
	})

	describe('serializeCursorValue', () => {
		it('should serialize a row value as a cursor carries it', () => {
			const date = new Date('2026-01-01T00:00:00Z')
			expect(serializeCursorValue('timestamp', { timestamp: date })).toBe(date.toISOString())
			expect(serializeCursorValue('event', { event: 'x' })).toBe('x')
			expect(serializeCursorValue('nextRunAt', { nextRunAt: null })).toBe(null)
			expect(serializeCursorValue('nextRunAt', {})).toBe(null)
		})
	})
})
