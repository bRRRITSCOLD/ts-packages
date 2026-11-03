import { expect } from 'chai'
import {
	createPostgresTableClient,
	PostgresConnectionConfig,
	PostgresConnections,
} from '../../src/postgres.js'
import { getPostgresContainer, setup } from './__utils__/utils.js'

const postgresConnections = new PostgresConnections()

type TodoRow = {
	id: number
	title: string
}

describe('postgres.ts', () => {
	before(async () => {
		await setup()
	})

	after(async () => {
		await postgresConnections.closeConnections()
	})

	context('PostgresConnections + createPostgresTableClient', () => {
		describe('PostgresConnections.initConnections + PostgresConnections.getConnection + createPostgresTableClient + PostgresConnections.closeConnection + PostgresConnections.closeConnections', () => {
			it('should connect 1...N postgres connection configurations, get a connection, create a table client (insert row, select row, delete rows), close one connection, and then close all connections', async () => {
				const container = await getPostgresContainer()

				const connection = {
					host: process.env.POSTGRES_DB_HOST as string,
					port: container.getMappedPort() as number,
					user: process.env.POSTGRES_DB_USER as string,
					password: process.env.POSTGRES_DB_PASSWORD as string,
					database: process.env.POSTGRES_DB_DATABASE as string,
				}

				const postgresConnectionConfigs: PostgresConnectionConfig[] = [
					{
						name: process.env.POSTGRES_DB_DATABASE as string,
						client: 'pg',
						connection,
					},
					{
						name: 'anothaOneDb',
						client: 'pg',
						connection,
					},
				]

				await postgresConnections.initConnections(postgresConnectionConfigs)

				const postgresConnection = postgresConnections.getConnection(
					process.env.POSTGRES_DB_DATABASE as string
				)

				expect(postgresConnection).to.not.be.undefined

				const db = postgresConnection!.db

				await db.schema.dropTableIfExists('todos')
				await db.schema.createTable('todos', (table) => {
					table.increments('id').primary()
					table.string('title').notNullable()
				})

				// A query builder is single-use, so each call builds its own.
				await createPostgresTableClient<TodoRow>({ db, tableName: 'todos' }).insert({
					title: 'write it down',
				})

				const rows = await createPostgresTableClient<TodoRow>({
					db,
					tableName: 'todos',
				}).where({ title: 'write it down' })

				expect(rows).to.have.lengthOf(1)
				expect(rows[0]?.title).to.equal('write it down')

				const deleted = await createPostgresTableClient<TodoRow>({
					db,
					tableName: 'todos',
				}).delete()

				expect(deleted).to.equal(1)

				await db.schema.dropTableIfExists('todos')

				await postgresConnections.closeConnection('anothaOneDb')

				expect(postgresConnections.getConnection('anothaOneDb')).to.be.undefined

				await postgresConnections.closeConnections()

				expect(
					postgresConnections.getConnection(process.env.POSTGRES_DB_DATABASE as string)
				).to.be.undefined
			})
		})
	})
})
