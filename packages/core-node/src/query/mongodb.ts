// node_modules
import { badRequestException } from '@brrritscold/core-js/error'
import type { CursorPayload, FieldSpecs, Filter, SortDirection } from '@brrritscold/core-js/query'
import { ObjectId } from 'mongodb'
// application
import type { QueryDialect } from '../query.js'

export type MongoFilter = Record<string, unknown>

export type MongoSort = Record<string, 1 | -1>

/**
 * The Mongo `QueryDialect`.
 *
 * @example
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import {
 *   createCursorCodec,
 *   querySchema,
 *   serializeCursorValue,
 * } from '@brrritscold/core-js/query'
 * import { hashQuery } from '@brrritscold/core-node/query'
 * import { MongoQueryDialect } from '@brrritscold/core-node/query/mongodb'
 * import { MongoClient } from 'mongodb'
 *
 * // ----- Set up once per service -----
 *
 * // The collection read, holding documents like { _id, name: 'cleanup', nextRunAt: Date | null }
 * const collection = new MongoClient('mongodb://localhost:27017').db('app').collection('jobs')
 *
 * // The fields callers may filter and sort on, and their types
 * const fields = {
 *   name: { type: 'string', filter: true, sort: true },
 *   nextRunAt: { type: 'date', nullable: true, filter: true, sort: true },
 * } as const
 *
 * // Validates a request body and fills in the default sort and page size
 * const jobsQuerySchema = querySchema({
 *   fields,
 *   sort: { defaultKey: 'name', defaultDirection: 'asc' },
 *   page: { defaultLimit: 50, maxLimit: 200 },
 * })
 *
 * // Turns "where the last page ended" into an opaque token, and back
 * const cursorCodec = createCursorCodec({ fields })
 *
 * // Translates validated filters, cursors and sorts into Mongo queries
 * const dialect = new MongoQueryDialect()
 *
 * // ----- Per request -----
 *
 * async function readJobsPage(requestBody: unknown) {
 *   // Throws a ZodError on a malformed body; omitted sort and page get their defaults
 *   const body = jobsQuerySchema.parse(requestBody)
 *   const { key: sortKey, direction: sortBy } = body.sort
 *
 *   // The caller's filter as a Mongo filter, e.g. { name: { $in: ['cleanup'] } }
 *   const compiled = dialect.compileFilter(fields, body.filter)
 *
 *   // Fingerprints the filter, so a cursor cannot be replayed against another one
 *   const filterHash = hashQuery(compiled)
 *
 *   // Page 1 has no cursor; a later one is decoded, with a 400 if the sort or filter changed
 *   const cursor = body.page.cursor
 *     ? cursorCodec.resolve({ cursor: body.page.cursor, sortKey, sortBy, filterHash })
 *     : null
 *
 *   // After page 1, only rows that come after the previous page's last row
 *   const where = cursor ? { $and: [compiled, dialect.cursorFilter(fields, cursor)] } : compiled
 *
 *   // One row more than the page size, to learn whether another page exists
 *   const rows = await collection
 *     .find(where)
 *     .sort(dialect.keysetSort(sortKey, sortBy)) // the sort field, then _id to break ties
 *     .limit(body.page.limit + 1)
 *     .toArray()
 *
 *   const items = rows.slice(0, body.page.limit)
 *   const last = items[items.length - 1]
 *
 *   // Where this page ended, as a token for the next request; null on the last page
 *   const nextCursor =
 *     rows.length > body.page.limit
 *       ? cursorCodec.encode({
 *           sortKey,
 *           sortBy,
 *           lastValue: serializeCursorValue(sortKey, last),
 *           lastId: last._id.toHexString(),
 *           filterHash,
 *         })
 *       : null
 *
 *   return { items, nextCursor }
 * }
 *
 * // ----- A caller walking the pages -----
 *
 * // Jobs named cleanup or nightly-sync, due from 2026 on, latest first, two per page
 * const request = {
 *   filter: {
 *     name: { in: ['cleanup', 'nightly-sync'] },
 *     nextRunAt: { gte: '2026-01-01T00:00:00Z' },
 *   },
 *   sort: { key: 'nextRunAt', direction: 'desc' },
 *   page: { limit: 2 },
 * }
 *
 * const page1 = await readJobsPage(request)
 *
 * // The next page is the same request plus the cursor the previous page returned
 * if (page1.nextCursor) {
 *   const page2 = await readJobsPage({ ...request, page: { limit: 2, cursor: page1.nextCursor } })
 * }
 */
export class MongoQueryDialect implements QueryDialect<MongoFilter, MongoSort> {
	/**
	 * Compiles a validated filter to a Mongo filter. Fields are ANDed; a field with
	 * no operator adds no constraint. notIn also matches documents missing the
	 * field, as Mongo's $nin does. A missing boolean counts as false, so eq: false
	 * compiles to { $ne: true }.
	 */
	compileFilter<F extends FieldSpecs>(fields: F, filter: Filter<F>): MongoFilter {
		const compiled: MongoFilter = {}

		for (const [field, predicate] of Object.entries(
			filter as Record<string, object | undefined>
		)) {
			if (!predicate) continue
			const operators: Record<string, unknown> = {}
			if ('in' in predicate && predicate.in) operators.$in = predicate.in
			if ('notIn' in predicate && predicate.notIn) operators.$nin = predicate.notIn
			if ('gte' in predicate && predicate.gte !== undefined && predicate.gte !== null) {
				operators.$gte = predicate.gte
			}
			if ('lte' in predicate && predicate.lte !== undefined && predicate.lte !== null) {
				operators.$lte = predicate.lte
			}
			if (fields[field]?.type === 'boolean' && 'eq' in predicate) {
				if (predicate.eq === true) operators.$eq = true
				if (predicate.eq === false) operators.$ne = true
			}

			if (Object.keys(operators).length > 0) compiled[field] = operators
		}

		return compiled
	}

	/**
	 * The keyset predicate that continues a walk after a decoded cursor's last row.
	 * The sort field's spec says how to read lastValue (a date field's is an ISO
	 * string) and whether the walk crosses a null block.
	 *
	 * A null lastValue on a sort field not declared nullable is rejected with a
	 * 400, as the cursor codec already does for a date field. This diverges from
	 * ledger-api, whose cursor compiled to `$gt`/`$lt: null`, matched nothing and
	 * ended the walk early: a field that can be null must be declared nullable.
	 */
	cursorFilter(fields: FieldSpecs, cursor: CursorPayload): MongoFilter {
		const { sortKey, sortBy, lastValue, lastId } = cursor
		const spec = fields[sortKey]
		if (lastValue === null && spec && !spec.nullable) {
			throw badRequestException(
				`malformed cursor: ${sortKey} is not nullable, so lastValue cannot be null`
			)
		}

		return this.keysetFilter({
			field: sortKey,
			sortBy,
			lastValue:
				spec?.type === 'date' && lastValue !== null ? new Date(lastValue) : lastValue,
			lastId: toObjectId(lastId),
			nullable: spec?.nullable,
		})
	}

	/**
	 * Continues a walk sorted by `keysetSort` after the row holding `lastValue`
	 * and `lastId`. The `_id` tiebreaker is what stops rows duplicating or
	 * vanishing at a page boundary when the sort value ties - keep it in any
	 * refactor. A walk sorted by `_id` itself needs only the one comparison.
	 *
	 * A nullable field sorts null and missing lowest, as Mongo does: first
	 * ascending, last descending. Its predicate crosses that block; a
	 * cursor inside it carries a null lastValue.
	 *
	 * Public for walks `cursorFilter` cannot serve, whose rows are not documents
	 * with an ObjectId `_id`: e.g. ledger-api pages its grouped reads after a
	 * `$group` stage, where `_id` is the group key. The caller passes that key as
	 * `lastId` and converts `lastValue` itself, since no field spec describes it.
	 */
	keysetFilter(params: {
		field: string
		sortBy: SortDirection
		lastValue: unknown
		lastId: unknown
		nullable?: boolean
	}): MongoFilter {
		const { field, sortBy, lastValue, lastId, nullable } = params
		const comparator = sortBy === 'asc' ? '$gt' : '$lt'
		if (field === '_id') return { _id: { [comparator]: lastId } }

		if (nullable && lastValue === null) {
			const inNullBlock = { [field]: null, _id: { [comparator]: lastId } }
			return sortBy === 'asc'
				? { $or: [inNullBlock, { [field]: { $ne: null } }] }
				: inNullBlock
		}

		const after = [
			{ [field]: { [comparator]: lastValue } },
			{ [field]: lastValue, _id: { [comparator]: lastId } },
		]
		return { $or: nullable && sortBy === 'desc' ? [...after, { [field]: null }] : after }
	}

	/**
	 * The sort every keyset walk pages over: its field, then `_id` as the tiebreak
	 * `keysetFilter` relies on. Sorting by `_id` itself leaves the one key.
	 */
	keysetSort(field: string, sortBy: SortDirection): MongoSort {
		const direction = sortBy === 'asc' ? 1 : -1
		return { [field]: direction, _id: direction }
	}
}

function toObjectId(hex: string): ObjectId {
	try {
		return new ObjectId(hex)
	} catch (err) {
		throw badRequestException(
			`malformed cursor: lastId is not a valid ObjectId "${hex}"`,
			err as Error
		)
	}
}
