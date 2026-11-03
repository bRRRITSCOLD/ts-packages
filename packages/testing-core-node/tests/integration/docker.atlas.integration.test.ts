import { expect } from 'chai'
import { MongoClient } from 'mongodb'

// application/testee
import { MongoDbAtlasLocalContainer } from '../../src/docker.js'

// fixtures
const atlasFixture = {
	username: 'userXYZ',
	password: '123abc',
	database: 'testDb',
	port: 27017,
}

const searchIndexName = 'entries-search-v1'

let container: MongoDbAtlasLocalContainer
let client: MongoClient

describe('docker.ts - MongoDbAtlasLocalContainer', () => {
	before(async () => {
		container = new MongoDbAtlasLocalContainer(atlasFixture)

		await container.start()

		client = new MongoClient(container.getConnectionString())

		await client.connect()
	})

	after(async () => {
		await client?.close().catch((e) => console.log(e))
		await container?.stop().catch((e) => console.log(e))
	})

	it('should start and expose a connection string that connects', async () => {
		expect(container.startedContainer).to.be.not.undefined
		expect(container.getMappedPort()).to.be.not.undefined
		expect(container.getConnectionString()).to.contain('directConnection=true')

		const { ok } = await client.db(atlasFixture.database).command({ ping: 1 })

		expect(ok).to.equal(1)
	})

	it('should create, query and drop an atlas search index', async () => {
		const collection = client.db(atlasFixture.database).collection('entries')

		await collection.insertOne({ contextJson: 'hello john smith', event: 'created' })

		await collection.createSearchIndex({
			name: searchIndexName,
			definition: { mappings: { dynamic: true } },
		})

		await MongoDbAtlasLocalContainer.waitForSearchIndex(collection, searchIndexName)

		const results = await collection
			.aggregate([
				{
					$search: {
						index: searchIndexName,
						text: { query: 'john', path: { wildcard: '*' } },
					},
				},
			])
			.toArray()

		expect(results).to.have.lengthOf(1)

		await collection.dropSearchIndex(searchIndexName)
	})

	it('should not reuse a container, so search indexes do not leak between runs', async () => {
		// a second container with identical params would be reused if reuse were on,
		// inheriting the first one's search indexes
		const second = new MongoDbAtlasLocalContainer(atlasFixture)

		await second.start()

		try {
			expect(second.startedContainer?.getId()).to.not.equal(
				container.startedContainer?.getId()
			)
		} finally {
			await second.stop()
		}
	})

	it('should throw a clear error when an index never becomes queryable', async () => {
		const collection = client.db(atlasFixture.database).collection('entries')

		try {
			await MongoDbAtlasLocalContainer.waitForSearchIndex(collection, 'does-not-exist', {
				timeoutMs: 500,
				intervalMs: 100,
			})

			expect.fail('expected waitForSearchIndex to throw')
		} catch (e) {
			expect((e as Error).message).to.contain('does-not-exist')
			expect((e as Error).message).to.contain('not found')
		}
	})
})
