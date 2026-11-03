// node_modules
import {
	FlociContainer,
	LocalstackContainer,
	MongoDbContainer,
	PostgresContainer,
} from '@brrritscold/testing-core-node/docker'

// utils
import { load } from '../../../src/dotenv.js'

export const getMongoDbContainer = async () => {
	const mongoDbContainer = new MongoDbContainer({
		username: process.env.MONGO_DB_USER!,
		password: process.env.MONGO_DB_PASSWORD!,
		database: process.env.MONGO_DB_NAME!,
	})

	await mongoDbContainer.start()

	return mongoDbContainer
}

export const getPostgresContainer = async () => {
	const postgresContainer = new PostgresContainer({
		username: process.env.POSTGRES_DB_USER!,
		password: process.env.POSTGRES_DB_PASSWORD!,
		database: process.env.POSTGRES_DB_DATABASE!,
	})

	await postgresContainer.start()

	return postgresContainer
}

export const getFlociContainer = async () => {
	const flociContainer = new FlociContainer()
	await flociContainer.start()
	return flociContainer
}

export const getLocalstackContainer = async () => {
	const localstackContainer = new LocalstackContainer({
		// pinned to the last community image - `latest` is now the licensed
		// unified image and exits on startup without an auth token
		version: '4.14.0',
		services: 'secretsmanager',
		defaultRegion: 'us-east-1',
	})

	await localstackContainer.start()

	return localstackContainer
}

export const setup = async () => {
	load({ path: '.env.integration.test', override: true, quiet: true })

	const mongoDbContainer = await getMongoDbContainer()

	// we do this because of the local testcontainers instance we use -
	// they find an open port automatically for us
	process.env.MONGO_DB_PORT = `${mongoDbContainer.getMappedPort()}`
}

export const teardown = async () => {
	load({ path: '.env.integration.test', override: true, quiet: true })

	const mongoDbContainer = await getMongoDbContainer()

	await mongoDbContainer.stop()
}
