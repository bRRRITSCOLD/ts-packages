import knex, { Knex } from 'knex'

export type PostgresConnectionEvent = {
	name: string
	handler: (...args: unknown[]) => unknown
}

export type PostgresConnectionConfig = Knex.Config & {
	name: string
	events?: PostgresConnectionEvent[]
}

export const POSTGRES_CLIENT_OPTIONS_DEFAULTS = {
	pool: {
		min: 3,
		max: 10,
		idleTimeoutMillis: 120000,
	},
	acquireConnectionTimeout: 120000,
	searchPath: ['public'] as const,
}

export type PostgresConnection = {
	db: Knex
	config: PostgresConnectionConfig
}

/**
 * @example
 * ///////////////
 * ///// CJS /////
 * ///////////////
 * const { PostgresConnections } = require('@brrritscold/core-node/postgres')
 *
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { PostgresConnections } from '@brrritscold/core-node/postgres'
 *
 * const postgresConnections = new PostgresConnections()
 *
 * await postgresConnections.initConnections([{
 *     name: 'myDb',
 *     client: 'pg',
 *     connection: {
 *         host: 'localhost',
 *         port: 5432,
 *         user: 'myUser',
 *         password: 'myPassword',
 *         database: 'myDatabase',
 *     }
 * }])
 *
 * const postgresConnection = postgresConnections.getConnection('myDb')
 *
 * console.log(postgresConnection)
 * // { db: Knex, config: PostgresConnectionConfig }
 *
 * await postgresConnections.closeConnections()
 */
export class PostgresConnections {
	#connections: Map<string, PostgresConnection> = new Map()

	async initConnections(initConfigs: PostgresConnectionConfig[]) {
		for (const initConfig of initConfigs) {
			if (!this.#connections.has(initConfig.name)) {
				const db = knex({
					...initConfig,
					client: initConfig.client === 'postgresql' ? 'pg' : initConfig.client,
					pool: {
						...POSTGRES_CLIENT_OPTIONS_DEFAULTS.pool,
						...(initConfig.pool ?? {}),
					},
					acquireConnectionTimeout:
						initConfig.acquireConnectionTimeout ??
						POSTGRES_CLIENT_OPTIONS_DEFAULTS.acquireConnectionTimeout,
					searchPath: [
						...(initConfig.searchPath ?? POSTGRES_CLIENT_OPTIONS_DEFAULTS.searchPath),
					],
				})

				for (const event of initConfig.events ?? []) {
					db.on(event.name, (...args: unknown[]) => {
						event.handler(...args)
					})
				}

				await db.raw('select 1')

				this.#connections.set(initConfig.name, {
					db,
					config: initConfig,
				})
			}
		}
	}

	async closeConnection(name: string) {
		if (this.#connections.has(name)) {
			const connection = this.#connections.get(name)!
			await connection.db.destroy()
			this.#connections.delete(name)
		}
	}

	async closeConnections() {
		await Promise.all(
			[...this.#connections.keys()].map(async (key) => {
				await this.closeConnection(key)
			})
		)
	}

	getConnection(name: string) {
		return this.#connections.get(name)
	}
}

export type PostgresTableClient<T extends object> = Knex.QueryBuilder<T, unknown[]>

/**
 * @example
 * ///////////////
 * ///// CJS /////
 * ///////////////
 * const { createPostgresTableClient } = require('@brrritscold/core-node/postgres')
 *
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { createPostgresTableClient } from '@brrritscold/core-node/postgres'
 *
 * const client = createPostgresTableClient<{ id: number; name: string }>({
 *     db,
 *     tableName: 'mySchema.myTable',
 * })
 *
 * const rows = await client.select('*').where({ id: 1 })
 *
 * console.log(rows)
 * // [{ id: 1, name: 'foo' }]
 */
export const createPostgresTableClient = <T extends object>({
	db,
	tableName,
	schemaName,
}: {
	db: Knex
	tableName: string
	schemaName?: string
}): PostgresTableClient<T> => {
	if (schemaName) {
		return db.withSchema(schemaName).from<T>(tableName)
	}

	return db<T>(tableName)
}
