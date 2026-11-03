import { expect } from 'chai'
import {
	createMongoCollectionClient,
	MongoConnectionConfig,
	MongoConnections,
	MongoStrictMatchKeysAndValues,
} from '../../src/mongodb.js'
import { getMongoDbContainer, setup } from './__utils__/utils.js'

const mongoConnections = new MongoConnections()

describe('mongodb.ts', () => {
	before(async () => {
		await setup()
	})

	after(async () => {
		await mongoConnections.closeConnections()
	})

	context('MongoConnections + createMongoCollectionClient', () => {
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

				expect(result).to.be.undefined
				expect(error).to.be.undefined

				let connectionOne = mongoConnections.getConnection(mongoConnectionConfigs[0].name)

				expect(connectionOne).to.be.not.undefined
				expect(connectionOne?.client).to.be.not.undefined
				expect(connectionOne?.db).to.be.not.undefined
				expect(connectionOne?.config).to.be.not.undefined

				let connectionTwo = mongoConnections.getConnection(mongoConnectionConfigs[1].name)

				expect(connectionTwo).to.be.not.undefined
				expect(connectionTwo?.client).to.be.not.undefined
				expect(connectionTwo?.db).to.be.not.undefined
				expect(connectionTwo?.config).to.be.not.undefined

				let connectionThree = mongoConnections.getConnection(mongoConnectionConfigs[2].name)

				expect(connectionThree).to.be.not.undefined
				expect(connectionThree?.client).to.be.not.undefined
				expect(connectionThree?.db).to.be.not.undefined
				expect(connectionThree?.config).to.be.not.undefined

				const todosCollectionClient = createMongoCollectionClient<{
					id: 1
					description: string
					completed: boolean
				}>({
					db: connectionOne!.db,
					collectionName: 'todos',
				})

				let deleteManyResponse = await todosCollectionClient.deleteMany({})

				expect(deleteManyResponse).to.be.not.undefined
				expect(deleteManyResponse.deletedCount).to.be.not.undefined
				expect(deleteManyResponse.acknowledged).to.be.true

				const insertOneResponse = await todosCollectionClient.insertOne({
					id: 1,
					description: 'Some lame task.',
					completed: false,
				})

				expect(insertOneResponse).to.be.not.undefined
				expect(insertOneResponse.insertedId).to.be.not.undefined
				expect(insertOneResponse.acknowledged).to.be.true

				const findQuery: MongoStrictMatchKeysAndValues<{
					id: 1
					description: string
					completed: boolean
				}> = { id: 1 }

				const findResponse = await todosCollectionClient.find(findQuery).toArray()

				expect(findResponse).to.be.not.undefined
				expect(findResponse.length).to.eq(1)
				expect(findResponse[0].id).to.eq(findQuery.id)

				deleteManyResponse = await todosCollectionClient.deleteMany({})

				expect(deleteManyResponse).to.be.not.undefined
				expect(deleteManyResponse.deletedCount).to.eq(1)
				expect(deleteManyResponse.acknowledged).to.be.true

				await mongoConnections.closeConnection(mongoConnectionConfigs[0].name)

				connectionOne = mongoConnections.getConnection(mongoConnectionConfigs[0].name)

				expect(connectionOne).to.be.undefined

				connectionTwo = mongoConnections.getConnection(mongoConnectionConfigs[1].name)

				expect(connectionTwo).to.be.not.undefined
				expect(connectionTwo?.client).to.be.not.undefined
				expect(connectionTwo?.db).to.be.not.undefined
				expect(connectionTwo?.config).to.be.not.undefined

				connectionThree = mongoConnections.getConnection(mongoConnectionConfigs[2].name)

				expect(connectionThree).to.be.not.undefined
				expect(connectionThree?.client).to.be.not.undefined
				expect(connectionThree?.db).to.be.not.undefined
				expect(connectionThree?.config).to.be.not.undefined

				await mongoConnections.closeConnections()

				connectionTwo = mongoConnections.getConnection(mongoConnectionConfigs[1].name)

				expect(connectionTwo).to.be.undefined

				connectionThree = mongoConnections.getConnection(mongoConnectionConfigs[2].name)

				expect(connectionThree).to.be.undefined
			})
		})
	})
})
