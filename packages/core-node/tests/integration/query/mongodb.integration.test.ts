import { createCursorCodec, Filter, serializeCursorValue } from '@brrritscold/core-js/query'
import { expect } from 'chai'
import { Collection, Document, ObjectId } from 'mongodb'
import { MongoConnectionConfig, MongoConnections } from '../../../src/mongodb.js'
// application/testee
import { MongoQueryDialect } from '../../../src/query/mongodb.js'
import { hashQuery } from '../../../src/query.js'
import { getMongoDbContainer, setup } from '../__utils__/utils.js'

// a job scheduler's fields: nextRunAt is null once a job has run.
// owner is a nullable string, so a string walk crosses a null block too
const fields = {
	nextRunAt: { type: 'date', nullable: true, filter: ['gte', 'lte'], sort: true },
	name: { type: 'string', filter: true, sort: true },
	owner: { type: 'string', nullable: true, filter: true, sort: true },
	disabled: { type: 'boolean', filter: true },
} as const

const codec = createCursorCodec({ fields })
const dialect = new MongoQueryDialect()

const day = (d: number) => new Date(`2026-01-0${d}T00:00:00Z`)

// Null, missing and tied values on the nullable sort keys, and ties on name, so
// every page boundary case occurs
const jobs: Document[] = [
	{ name: 'b', nextRunAt: null, owner: 'x' },
	{ name: 'a', owner: null },
	{ name: 'b', nextRunAt: null, disabled: true },
	{ name: 'c', nextRunAt: day(2), owner: 'y' },
	{ name: 'a', nextRunAt: day(1), disabled: false, owner: 'x' },
	{ name: 'c', nextRunAt: day(2), owner: null },
	{ name: 'd', nextRunAt: day(3), disabled: true },
]

const mongoConnections = new MongoConnections()
let collection: Collection

// Walks every page the way a service does: compile, resume from the decoded
// cursor, then encode the next one from the page's last row
async function walk(
	sortKey: 'nextRunAt' | 'name' | 'owner',
	sortBy: 'asc' | 'desc',
	filter: Filter<typeof fields> = {},
	limit = 2
): Promise<ObjectId[]> {
	const compiled = dialect.compileFilter(fields, filter)
	const filterHash = hashQuery(compiled)
	const seen: ObjectId[] = []
	let token: string | undefined

	for (let pages = 0; pages < 20; pages++) {
		const cursor = token ? codec.resolve({ cursor: token, sortKey, sortBy, filterHash }) : null
		const rows = await collection
			.find(cursor ? { $and: [compiled, dialect.cursorFilter(fields, cursor)] } : compiled)
			.sort(dialect.keysetSort(sortKey, sortBy))
			.limit(limit)
			.toArray()

		seen.push(...rows.map((row) => row._id))
		if (rows.length < limit) return seen

		const last = rows[rows.length - 1]
		token = codec.encode({
			sortKey,
			sortBy,
			lastValue: serializeCursorValue(sortKey, last),
			lastId: last._id.toHexString(),
			filterHash,
		})
	}
	throw new Error('walk did not end')
}

async function unpaged(sortKey: string, sortBy: 'asc' | 'desc', filter: Document = {}) {
	const rows = await collection.find(filter).sort(dialect.keysetSort(sortKey, sortBy)).toArray()
	return rows.map((row) => row._id)
}

describe('query/mongodb.ts', () => {
	before(async () => {
		await setup()
		const container = await getMongoDbContainer()
		const config: MongoConnectionConfig = {
			protocol: process.env.MONGO_DB_PROTOCOL as string,
			host: process.env.MONGO_DB_HOST as string,
			port: container.getMappedPort() as number,
			name: process.env.MONGO_DB_DATABASE as string,
			database: process.env.MONGO_DB_DATABASE as string,
			options: {
				auth: {
					username: process.env.MONGO_DB_USER as string,
					password: process.env.MONGO_DB_PASSWORD as string,
				},
			},
		}
		await mongoConnections.initConnections([config])
		collection = mongoConnections.getConnection(config.name)!.db.collection('jobs')
		await collection.deleteMany({})
		await collection.insertMany(jobs.map((job) => ({ ...job })))
	})

	after(async () => {
		await collection.deleteMany({})
		await mongoConnections.closeConnections()
	})

	for (const sortKey of ['nextRunAt', 'name', 'owner'] as const) {
		for (const sortBy of ['asc', 'desc'] as const) {
			it(`should page through every job once, in order, by ${sortKey} ${sortBy}`, async () => {
				const expected = await unpaged(sortKey, sortBy)
				expect(expected).to.have.length(jobs.length)

				for (const limit of [1, 2, 3]) {
					expect(await walk(sortKey, sortBy, {}, limit)).to.deep.eq(expected)
				}
			})
		}
	}

	it('should never match a null or missing nextRunAt with a gte bound', async () => {
		const compiled = dialect.compileFilter(fields, { nextRunAt: { gte: new Date(0) } })
		const rows = await collection.find(compiled).toArray()

		expect(rows).to.have.length(4)
		for (const row of rows) expect(row.nextRunAt).to.be.instanceOf(Date)
	})

	it('should count a missing disabled as false', async () => {
		const enabled = await collection
			.find(dialect.compileFilter(fields, { disabled: { eq: false } }))
			.toArray()
		const disabled = await collection
			.find(dialect.compileFilter(fields, { disabled: { eq: true } }))
			.toArray()

		expect(enabled).to.have.length(5)
		expect(disabled).to.have.length(2)
	})

	it('should page a filtered walk by nextRunAt desc across the null block', async () => {
		const filter = { disabled: { eq: false } }
		const expected = await unpaged('nextRunAt', 'desc', dialect.compileFilter(fields, filter))

		expect(await walk('nextRunAt', 'desc', filter)).to.deep.eq(expected)
	})
})
