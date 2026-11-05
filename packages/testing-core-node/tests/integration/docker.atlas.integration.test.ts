import { MongoClient } from 'mongodb'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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
	beforeAll(async () => {
		container = new MongoDbAtlasLocalContainer(atlasFixture)

		await container.start()

		client = new MongoClient(container.getConnectionString())

		await client.connect()
	})

	afterAll(async () => {
		await client?.close().catch((e) => console.log(e))
		await container?.stop().catch((e) => console.log(e))
	})

	it('should start and expose a connection string that connects', async () => {
		expect(container.startedContainer).toBeDefined()
		expect(container.getMappedPort()).toBeDefined()
		expect(container.getConnectionString()).toContain('directConnection=true')

		const { ok } = await client.db(atlasFixture.database).command({ ping: 1 })

		expect(ok).toBe(1)
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

		expect(results).toHaveLength(1)

		await collection.dropSearchIndex(searchIndexName)
	})

	it('should not reuse a container, so search indexes do not leak between runs', async () => {
		// a second container with identical params would be reused if reuse were on,
		// inheriting the first one's search indexes
		const second = new MongoDbAtlasLocalContainer(atlasFixture)

		await second.start()

		try {
			expect(second.startedContainer?.getId()).not.toBe(container.startedContainer?.getId())
		} finally {
			await second.stop()
		}
	})

	it('should throw a clear error when an index never becomes queryable', async () => {
		const collection = client.db(atlasFixture.database).collection('entries')

		const waiting = MongoDbAtlasLocalContainer.waitForSearchIndex(
			collection,
			'does-not-exist',
			{
				timeoutMs: 500,
				intervalMs: 100,
			}
		)

		await expect(waiting).rejects.toThrow('"does-not-exist"')
		await expect(waiting).rejects.toThrow('status: not found')
	})
})
