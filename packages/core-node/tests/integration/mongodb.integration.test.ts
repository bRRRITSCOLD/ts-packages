import { afterAll, describe, expect, it } from 'vitest'
import {
	createMongoCollectionClient,
	MongoConnectionConfig,
	MongoConnections,
	MongoStrictMatchKeysAndValues,
} from '../../src/mongodb.js'
import { getMongoDbContainer } from './__utils__/utils.js'

const mongoConnections = new MongoConnections()

describe('mongodb.ts', () => {
	afterAll(async () => {
		await mongoConnections.closeConnections()
	})

	describe('MongoConnections + createMongoCollectionClient', () => {
		describe('MongoConnections.initConnections + MongoConnections.getConnection + createMongoCollectionClient + MongoConnections.closeConnection + MongoConnections.closeConnections', () => {
			it('should connect 1...N mongo connection configuration, get a mongo connection, create a mongo collection client (insert document, find document, delete documents), close a mongo connection, and then close all connections', async () => {
				const container = await getMongoDbContainer()

				const mongoConnectionConfigs: MongoConnectionConfig[] = [
					{
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
					},
					{
						protocol: process.env.MONGO_DB_PROTOCOL as string,
						host: process.env.MONGO_DB_HOST as string,
						port: container.getMappedPort() as number,
						name: 'anothaOneDb',
						database: 'anothaOneDb',
					},
					{
						protocol: process.env.MONGO_DB_PROTOCOL as string,
						host: process.env.MONGO_DB_HOST as string,
						port: container.getMappedPort() as number,
						name: 'alrightAlrightAnothaOneDb',
						database: 'alrightAlrightAnothaOneDb',
					},
				]

				let error
				let result
				try {
					result = await mongoConnections.initConnections(mongoConnectionConfigs)
				} catch (err) {
					error = err
				}

				expect(result).toBeUndefined()
				expect(error).toBeUndefined()

				let connectionOne = mongoConnections.getConnection(mongoConnectionConfigs[0].name)

				expect(connectionOne).toBeDefined()
				expect(connectionOne?.client).toBeDefined()
				expect(connectionOne?.db).toBeDefined()
				expect(connectionOne?.config).toBeDefined()

				let connectionTwo = mongoConnections.getConnection(mongoConnectionConfigs[1].name)

				expect(connectionTwo).toBeDefined()
				expect(connectionTwo?.client).toBeDefined()
				expect(connectionTwo?.db).toBeDefined()
				expect(connectionTwo?.config).toBeDefined()

				let connectionThree = mongoConnections.getConnection(mongoConnectionConfigs[2].name)

				expect(connectionThree).toBeDefined()
				expect(connectionThree?.client).toBeDefined()
				expect(connectionThree?.db).toBeDefined()
				expect(connectionThree?.config).toBeDefined()

				const todosCollectionClient = createMongoCollectionClient<{
					id: 1
					description: string
					completed: boolean
				}>({
					db: connectionOne!.db,
					collectionName: 'todos',
				})

				let deleteManyResponse = await todosCollectionClient.deleteMany({})

				expect(deleteManyResponse).toBeDefined()
				expect(deleteManyResponse.deletedCount).toBeDefined()
				expect(deleteManyResponse.acknowledged).toBe(true)

				const insertOneResponse = await todosCollectionClient.insertOne({
					id: 1,
					description: 'Some lame task.',
					completed: false,
				})

				expect(insertOneResponse).toBeDefined()
				expect(insertOneResponse.insertedId).toBeDefined()
				expect(insertOneResponse.acknowledged).toBe(true)

				const findQuery: MongoStrictMatchKeysAndValues<{
					id: 1
					description: string
					completed: boolean
				}> = { id: 1 }

				const findResponse = await todosCollectionClient.find(findQuery).toArray()

				expect(findResponse).toBeDefined()
				expect(findResponse.length).toBe(1)
				expect(findResponse[0].id).toBe(findQuery.id)

				deleteManyResponse = await todosCollectionClient.deleteMany({})

				expect(deleteManyResponse).toBeDefined()
				expect(deleteManyResponse.deletedCount).toBe(1)
				expect(deleteManyResponse.acknowledged).toBe(true)

				await mongoConnections.closeConnection(mongoConnectionConfigs[0].name)

				connectionOne = mongoConnections.getConnection(mongoConnectionConfigs[0].name)

				expect(connectionOne).toBeUndefined()

				connectionTwo = mongoConnections.getConnection(mongoConnectionConfigs[1].name)

				expect(connectionTwo).toBeDefined()
				expect(connectionTwo?.client).toBeDefined()
				expect(connectionTwo?.db).toBeDefined()
				expect(connectionTwo?.config).toBeDefined()

				connectionThree = mongoConnections.getConnection(mongoConnectionConfigs[2].name)

				expect(connectionThree).toBeDefined()
				expect(connectionThree?.client).toBeDefined()
				expect(connectionThree?.db).toBeDefined()
				expect(connectionThree?.config).toBeDefined()

				await mongoConnections.closeConnections()

				connectionTwo = mongoConnections.getConnection(mongoConnectionConfigs[1].name)

				expect(connectionTwo).toBeUndefined()

				connectionThree = mongoConnections.getConnection(mongoConnectionConfigs[2].name)

				expect(connectionThree).toBeUndefined()
			})
		})
	})
})
