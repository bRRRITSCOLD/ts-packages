// node_modules
import { createHash } from 'node:crypto'
import type { CursorPayload, FieldSpecs, Filter, SortDirection } from '@brrritscold/core-js/query'

/**
 * What a datastore implements to serve the flat-read query kit from
 * @brrritscold/core-js/query: a validated filter to a query filter, a cursor
 * to the keyset predicate that resumes after it, and the sort the walk pages
 * over. `Where` is its filter type and `OrderBy` its sort type. Every
 * implementation must page the same way: null and missing sort lowest, with
 * the id as the tiebreak.
 *
 * Implementations live in their own entry, so each needs only its own driver:
 * `@brrritscold/core-node/query/mongodb` for Mongo.
 */
export interface QueryDialect<Where, OrderBy> {
	compileFilter<F extends FieldSpecs>(fields: F, filter: Filter<F>): Where
	cursorFilter(fields: FieldSpecs, cursor: CursorPayload): Where
	keysetSort(field: string, sortBy: SortDirection): OrderBy
}

/**
 * Fingerprints what a read asked for, so a later page can prove it is the same
 * read. Hashes the compiled filter in canonical form, so field order,
 * value-list order and an empty predicate do not count as a change, then each
 * of `extras` (canonicalised, in the order given) after it. Lists in `extras`
 * keep their order, since it may mean something there. An undefined extra is
 * left out.
 */
export function hashQuery(
	compiledFilter: Record<string, unknown>,
	extras: Record<string, unknown> = {}
): string {
	const canonicalExtras = Object.fromEntries(
		Object.entries(extras).map(([key, value]) => [key, canonicalize(value, false)])
	)
	return createHash('sha256')
		.update(JSON.stringify({ filter: canonicalize(compiledFilter, true), ...canonicalExtras }))
		.digest('base64url')
}

// Key order is sorted too: a filter rebuilt by spread lists the same fields in
// another order. A list's items are canonicalised before it is sorted, so two
// lists of the same objects sort the same way
function canonicalize(value: unknown, sortLists: boolean): unknown {
	if (Array.isArray(value)) {
		const items = value.map((item) => canonicalize(item, sortLists))
		return sortLists ? items.sort((a, b) => compare(sortKey(a), sortKey(b))) : items
	}
	if (value instanceof Date) return value.toISOString()
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([a], [b]) => compare(a, b))
				.map(([key, inner]) => [key, canonicalize(inner, sortLists)])
		)
	}
	return value
}

// A string sorts by itself, so a value list hashes as it always has
function sortKey(item: unknown): string {
	return typeof item === 'string' ? item : JSON.stringify(item)
}

function compare(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0
}
