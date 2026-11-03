import {
	Collection,
	CollectionOptions,
	Db,
	Document,
	MongoClient,
	MongoClientOptions,
	StrictFilter,
	StrictMatchKeysAndValues,
	StrictUpdateFilter,
} from 'mongodb'

export type MongoConnectionConfig = {
	name: string
	protocol: string
	host: string
	port: number
	database: string
	options?: MongoClientOptions
}

const MONGO_CLIENT_OPTIONS_DEFAULTS = {
	minPoolSize: 3,
	maxPoolSize: 10,
	connectTimeoutMS: 120000,
	socketTimeoutMS: 120000,
	serverSelectionTimeoutMS: 30000,
	retryWrites: true,
	retryReads: true,
	w: 'majority',
	keepAliveInitialDelay: 120000,
}

/**
 * @example
 * ///////////////
 * ///// CJS /////
 * ///////////////
 * const { MongoConnectionConfig, MongoConnections } = require('@brrritscold/core-node/mongodb')
 *
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { MongoConnectionConfig, MongoConnections } from '@brrritscold/core-node/mongodb'
 *
 * const mongoConnectionConfigs: MongoConnectionConfig[] = [
 *     {
 *         protocol: 'mongodb+srv',
 *         host: 'some-host.mongodb.com',
 *         port: 27017,
 *         name: 'someName',
 *         database: 'someDb',
 *         options: {
 *             auth: { username: 'someUsername', password: 'somePassword' }
 *         }
 *     },
 *     {
 *         protocol: 'mongodb',
 *         host: 'localhost',
 *         port: 27017,
 *         name: 'someOtherName',
 *         database: 'someOtherDb',
 *     },
 * ]
 *
 * const mongoConnections = new MongoConnections()
 *
 * await mongoConnections.initConnections(mongoConnectionConfigs)
 *
 * let mongoConnection = mongoConnections.getConnection(mongoConnectionConfigs[0].name)
 *
 * console.log(mongoConnection)
 * // { db: Db, client: MongoClient, ... }
 *
 * await mongoConnections.closeConnection(mongoConnectionConfigs[0].name)
 *
 * mongoConnection = mongoConnections.getConnection(mongoConnectionConfigs[0].name)
 *
 * console.log(mongoConnection)
 * // undefined
 *
 * await mongoConnections.closeConnections()
 *
 * mongoConnection = mongoConnections.getConnection(mongoConnectionConfigs[0].name)
 *
 * console.log(mongoConnection)
 * // undefined
 *
 * mongoConnection = mongoConnections.getConnection(mongoConnectionConfigs[1].name)
 *
 * console.log(mongoConnection)
 * // undefined
 */
export class MongoConnections {
	#connections: Map<string, { db: Db; client: MongoClient; config: MongoConnectionConfig }> =
		new Map()

	async initConnections(initConfigs: MongoConnectionConfig[]) {
		for (const initConfig of initConfigs) {
			if (!this.#connections.has(initConfig.name)) {
				const url = `${initConfig.protocol}://${initConfig.host}${
					initConfig.protocol.includes('+srv') ? '' : `:${initConfig.port}`
				}`

				let client = new MongoClient(
					url,
					Object.assign({}, MONGO_CLIENT_OPTIONS_DEFAULTS, initConfig.options)
				)

				client = await client.connect()

				const db = client.db(initConfig.database)

				this.#connections.set(initConfig.name, { client, db, config: initConfig })
			}
		}

		return
	}

	async closeConnection(name: string) {
		if (this.#connections.has(name)) {
			const connection = this.#connections.get(name)!
			await connection.client.close()
			this.#connections.delete(name)
		}

		return
	}

	async closeConnections() {
		await Promise.all(
			[...this.#connections.keys()].map((key) => {
				return (async () => {
					await this.closeConnection(key)
				})()
			})
		)

		return
	}

	getConnection(name: string) {
		return this.#connections.get(name)
	}
}

export type MongoStrictFilter<T> = StrictFilter<T>
export type MongoStrictMatchKeysAndValues<T> = StrictMatchKeysAndValues<T>
export type MongoStrictUpdateFilter<T> = StrictUpdateFilter<T>

export type MongoCollectionClient<T extends Document> = Collection<T>

/**
 * @example
 * ///////////////
 * ///// CJS /////
 * ///////////////
 * const { MongoConnectionConfig, MongoConnections, createMongoCollectionClient, MongoStrictMatchKeysAndValues } = require('@brrritscold/core-node/mongodb')
 *
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { MongoConnectionConfig, MongoConnections, createMongoCollectionClient, MongoStrictMatchKeysAndValues } from '@brrritscold/core-node/mongodb'
 *
 * const mongoConnectionConfigs: MongoConnectionConfig[] = [
 *     {
 *         protocol: 'mongodb+srv',
 *         host: 'some-host.mongodb.com',
 *         port: 27017,
 *         name: 'someName',
 *         database: 'someDb',
 *         options: {
 *             auth: { username: 'someUsername', password: 'somePassword' }
 *         }
 *     },
 *     {
 *         protocol: 'mongodb',
 *         host: 'localhost',
 *         port: 27017,
 *         name: 'someOtherName',
 *         database: 'someOtherDb',
 *     },
 * ]
 *
 * const mongoConnections = new MongoConnections()
 *
 * await mongoConnections.initConnections(mongoConnectionConfigs)
 *
 * const mongoConnection = mongoConnections.getConnection(mongoConnectionConfigs[0].name)
 *
 * const todosCollectionClient = createMongoCollectionClient<{ id: 1, description: string; completed: boolean; }>({
 *     db: mongoConnection!.db,
 *     collectionName: 'todos'
 * })
 *
 * const insertOneResponse = await todosCollectionClient.insertOne({
 *     id: 1,
 *     description: 'Some lame task.',
 *     completed: false
 * })
 *
 * console.log(insertOneResponse)
 * // { acknowledged: true, insertedId: ... }
 *
 * const findQuery: MongoStrictMatchKeysAndValues<{ id: 1, description: string; completed: boolean; }> = { id: 1 }
 *
 * const findResponse = await todosCollectionClient.find(findQuery).toArray()
 *
 * console.log(findResponse)
 * // [{ id: 1, ... }
 */
export const createMongoCollectionClient = <T extends Document>({
	db,
	collectionName,
	options,
}: {
	db: Db
	collectionName: string
	options?: CollectionOptions
}): MongoCollectionClient<T> => {
	return db.collection<T>(collectionName, options)
}
