// node_modules
import { z } from 'zod/v4'

import { badRequestException } from './error.js'

/**
 * The flat-read query kit: a per-service field spec, the filter DSL and the
 * { filter, sort, page } envelope built from it, and the cursor codec that pages
 * a keyset walk. Compiling to Mongo lives in @brrritscold/core-node/query.
 *
 * @example
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { createCursorCodec, querySchema } from '@brrritscold/core-js/query'
 *
 * const fields = {
 *   nextRunAt: { type: 'date', nullable: true, filter: ['gte', 'lte'], sort: true },
 *   name: { type: 'string', filter: true, sort: true },
 *   disabled: { type: 'boolean', filter: true },
 * } as const
 *
 * const bodySchema = querySchema({
 *   fields,
 *   sort: { defaultKey: 'nextRunAt', defaultDirection: 'asc' },
 *   page: { defaultLimit: 50, maxLimit: 200 },
 * })
 * const cursorCodec = createCursorCodec({ fields })
 */

export type FieldType = 'string' | 'date' | 'boolean'

export type SortDirection = 'asc' | 'desc'

const FILTER_OPERATORS = {
	string: ['in', 'notIn'],
	date: ['gte', 'lte'],
	boolean: ['eq'],
} as const

export type FilterOperator<T extends FieldType = FieldType> = (typeof FILTER_OPERATORS)[T][number]

type FieldSpecOf<T extends FieldType> = {
	type: T
	// Null and missing sort lowest, as Mongo sorts them; the keyset crosses that block
	nullable?: boolean
	// true allows every operator of the type, a list allows only those
	filter?: boolean | readonly FilterOperator<T>[]
	// A boolean is not a sort key: a cursor's lastValue is a string, number or null
	sort?: T extends 'boolean' ? never : boolean
}

/**
 * How a service exposes one stored field: its type, whether it can be null or
 * missing, and whether callers may filter or sort on it. Declared once per
 * service, it drives the filter schema, the sort whitelist and the cursor codec.
 */
export type FieldSpec = FieldSpecOf<'string'> | FieldSpecOf<'date'> | FieldSpecOf<'boolean'>

export type FieldSpecs = Record<string, FieldSpec>

export type StringPredicate = { in?: string[]; notIn?: string[] }
export type DatePredicate = { gte?: Date; lte?: Date }
// A missing field counts as false
export type BooleanPredicate = { eq?: boolean }

type PredicateOf<T extends FieldType> = T extends 'string'
	? StringPredicate
	: T extends 'date'
		? DatePredicate
		: BooleanPredicate

type FilterableKeys<F extends FieldSpecs> = {
	[K in keyof F]: F[K]['filter'] extends true | readonly unknown[] ? K : never
}[keyof F]

export type SortableKeys<F extends FieldSpecs> = Extract<
	{ [K in keyof F]: F[K]['sort'] extends true ? K : never }[keyof F],
	string
>

// A filter list narrows the predicate to the operators it names
type PredicateFor<S extends FieldSpec> = S['filter'] extends readonly (infer O)[]
	? Pick<PredicateOf<S['type']>, Extract<O, keyof PredicateOf<S['type']>>>
	: PredicateOf<S['type']>

export type Filter<F extends FieldSpecs> = {
	[K in FilterableKeys<F>]?: PredicateFor<F[K]>
}

// The planner stops merging per-value index scans and switches to a blocking
// sort past this many values, so it caps each in / notIn list
export const MAX_FILTER_VALUES = 200

function allowedOperators(spec: FieldSpec): readonly FilterOperator[] {
	if (spec.filter === true) return FILTER_OPERATORS[spec.type]
	return spec.filter || []
}

const filterValuesSchema = z.array(z.string()).min(1).max(MAX_FILTER_VALUES).optional()

const filterDateSchema = z.iso
	.datetime({ offset: true })
	.transform((value) => new Date(value))
	.optional()

function predicateSchema(spec: FieldSpec) {
	const operators = allowedOperators(spec)
	const pick = (all: Record<string, z.ZodType>) =>
		Object.fromEntries(Object.entries(all).filter(([op]) => operators.some((o) => o === op)))

	switch (spec.type) {
		case 'string':
			return z
				.object(pick({ in: filterValuesSchema, notIn: filterValuesSchema }))
				.strict()
				.refine(
					(predicate: StringPredicate) =>
						!predicate.in?.some((value) => predicate.notIn?.includes(value)),
					{ message: 'in and notIn must not overlap' }
				)
		case 'date':
			return z
				.object(pick({ gte: filterDateSchema, lte: filterDateSchema }))
				.strict()
				.refine(({ gte, lte }: DatePredicate) => !gte || !lte || gte <= lte, {
					message: 'gte must not be after lte',
				})
		case 'boolean':
			return z.object(pick({ eq: z.boolean().optional() })).strict()
	}
}

/**
 * The filter a caller may send: one predicate per filterable field, with the
 * operators its type allows. Fields are ANDed, unknown fields are rejected, and
 * an omitted filter is {}.
 *
 * - string: in, notIn (at most MAX_FILTER_VALUES each, never overlapping)
 * - date: gte, lte (ISO date-times with an offset, parsed to Date)
 * - boolean: eq (a missing field counts as false)
 */
export function filterSchema<F extends FieldSpecs>(fields: F): z.ZodType<Filter<F>> {
	const shape = Object.fromEntries(
		Object.entries(fields)
			.filter(([, spec]) => allowedOperators(spec).length > 0)
			.map(([field, spec]) => [field, predicateSchema(spec).optional()])
	)

	return z.object(shape).strict().default({}) as unknown as z.ZodType<Filter<F>>
}

export type Sort<F extends FieldSpecs> = { key: SortableKeys<F>; direction: SortDirection }

/**
 * The sort a caller may send: a sortable field and a direction, each defaulted.
 */
export function sortSchema<F extends FieldSpecs>(params: {
	fields: F
	defaultKey: SortableKeys<F>
	defaultDirection: SortDirection
}): z.ZodType<Sort<F>> {
	const { fields, defaultKey, defaultDirection } = params

	return z
		.object({
			key: z.enum(sortableKeys(fields) as [string, ...string[]]).default(defaultKey),
			direction: z.enum(['asc', 'desc']).default(defaultDirection),
		})
		.strict()
		.prefault({}) as unknown as z.ZodType<Sort<F>>
}

export type Page = { limit: number; cursor?: string }

/**
 * The page a caller may ask for. maxLimit caps the page size, not the total a
 * walk returns.
 */
export function pageSchema(params: { defaultLimit: number; maxLimit: number }): z.ZodType<Page> {
	const { defaultLimit, maxLimit } = params

	return z
		.object({
			limit: z.number().int().min(1).max(maxLimit).default(defaultLimit),
			cursor: z.string().optional(),
		})
		.strict()
		.prefault({}) as unknown as z.ZodType<Page>
}

/**
 * The { filter, sort, page } request envelope. A service that takes more, such
 * as a search string, extends it.
 */
export function querySchema<F extends FieldSpecs>(params: {
	fields: F
	sort: { defaultKey: SortableKeys<F>; defaultDirection: SortDirection }
	page: { defaultLimit: number; maxLimit: number }
}) {
	const { fields, sort, page } = params

	return z
		.object({
			filter: filterSchema(fields),
			sort: sortSchema({ fields, ...sort }),
			page: pageSchema(page),
		})
		.strict()
}

function sortableKeys(fields: FieldSpecs): string[] {
	return Object.entries(fields)
		.filter(([, spec]) => spec.sort === true)
		.map(([field]) => field)
}

export type CursorValue = string | number | null

/**
 * What a cursor carries between pages. lastId is the `_id` of the page's last
 * row: the unique tiebreaker that stops rows duplicating or vanishing at a page
 * boundary when the sort value ties. Keep it in any refactor. filterHash is
 * what page 1 asked for, so a later page cannot quietly change it.
 *
 * A service that freezes more of page 1's read extends this schema.
 */
export const cursorPayloadSchema = z.object({
	sortKey: z.string(),
	sortBy: z.enum(['asc', 'desc'], {
		error: (issue) => `malformed cursor: invalid sortBy "${String(issue.input)}"`,
	}),
	lastId: z.string({ error: 'malformed cursor: lastId must be a string' }),
	lastValue: z.union([z.string(), z.number(), z.null()], {
		error: 'malformed cursor: lastValue must be string, number, or null',
	}),
	filterHash: z.string({ error: 'malformed cursor: filterHash must be a string' }).optional(),
})

export type CursorPayload = z.infer<typeof cursorPayloadSchema>

/**
 * Builds the cursor codec for a service's fields. The token is unsigned base64
 * JSON. decode checks the sortKey against the sortable fields, parses the
 * payload with `schema` and checks lastValue against the sort field's type;
 * every failure is a 400 naming what is malformed.
 */
export function createCursorCodec<
	F extends FieldSpecs,
	S extends z.ZodType<CursorPayload> = typeof cursorPayloadSchema,
>(params: { fields: F; schema?: S }) {
	const { fields } = params
	const schema = params.schema ?? cursorPayloadSchema
	const sortable = sortableKeys(fields)

	function encode(payload: z.input<S>): string {
		const bytes = new TextEncoder().encode(JSON.stringify(payload))
		// A loop, not a spread: spreading a large payload overflows the call stack
		let binary = ''
		for (const byte of bytes) binary += String.fromCharCode(byte)
		return btoa(binary)
	}

	function decode(token: string): z.output<S> {
		const parsed = parseCursorToken(token)

		if (!sortable.includes(parsed.sortKey as string)) {
			throw badRequestException(
				`malformed cursor: unknown sortKey "${String(parsed.sortKey)}"`
			)
		}

		const result = schema.safeParse(parsed)
		if (!result.success) throw badRequestException(result.error.issues[0].message, result.error)

		parseLastValue(result.data)
		return result.data as z.output<S>
	}

	/**
	 * The cursor's lastValue as the sort field stores it: a Date for a date field,
	 * null inside a nullable field's null block.
	 */
	function parseLastValue({ sortKey, lastValue }: CursorPayload): Date | CursorValue {
		const spec = fields[sortKey]
		if (spec?.type !== 'date') return lastValue
		if (lastValue === null && spec.nullable) return null

		if (typeof lastValue !== 'string') {
			throw badRequestException(
				`malformed cursor: ${sortKey} lastValue must be an ISO string (got ${typeof lastValue})`
			)
		}
		const date = new Date(lastValue)
		if (Number.isNaN(date.getTime())) {
			throw badRequestException(
				`malformed cursor: ${sortKey} lastValue is not a valid date "${lastValue}"`
			)
		}
		return date
	}

	/**
	 * Decodes a cursor and checks it continues the read it is sent with: a changed
	 * sort, or a changed filter (by hash), is a 400. A cursor with no hash cannot
	 * vouch for the filter, so it does not continue one.
	 */
	function resolve(params: {
		cursor: string
		sortKey: SortableKeys<F>
		sortBy: SortDirection
		filterHash?: string
	}): z.output<S> {
		const decoded = decode(params.cursor)

		if (decoded.sortKey !== params.sortKey || decoded.sortBy !== params.sortBy) {
			throw badRequestException('sort changed; restart pagination')
		}
		if (params.filterHash !== undefined && decoded.filterHash !== params.filterHash) {
			throw badRequestException('filter changed; restart pagination')
		}

		return decoded
	}

	return { encode, decode, resolve, parseLastValue }
}

/**
 * The sort field's value on a row, as a cursor carries it: a Date as its ISO
 * string, a missing value as null.
 */
export function serializeCursorValue(sortKey: string, row: Record<string, unknown>): CursorValue {
	const value = row[sortKey]
	if (value instanceof Date) return value.toISOString()
	if (value === undefined || value === null) return null
	if (typeof value === 'string' || typeof value === 'number') return value
	return String(value)
}

function parseCursorToken(token: string): Record<string, unknown> {
	let parsed: unknown
	try {
		const bytes = Uint8Array.from(atob(token), (char) => char.charCodeAt(0))
		const json = new TextDecoder().decode(bytes)
		parsed = JSON.parse(json)
	} catch (err) {
		throw badRequestException('malformed cursor: invalid base64 or JSON payload', err as Error)
	}

	if (!parsed || typeof parsed !== 'object') {
		throw badRequestException('malformed cursor: payload is not an object')
	}

	return parsed as Record<string, unknown>
}
