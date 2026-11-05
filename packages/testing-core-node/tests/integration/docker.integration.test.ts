import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// application/testee
import {
	FlociContainer,
	LocalstackContainer,
	MongoDbContainer,
	PostgresContainer,
} from '../../src/docker.js'

// fixtures
const mongoDbFixture = {
	version: '8.0.11',
	username: 'userXYZ',
	password: '123abc',
	database: 'testDb',
	port: 27017,
}

const postgresFixture = {
	version: '18.0',
	username: 'userXYZ',
	password: '123abc',
	database: 'testDb',
	port: 5432,
}

const localstackFixture = {
	version: '2.3.2', // Last free version before LocalStack became paid
	services: 'secretsmanager',
	defaultRegion: 'us-east-1',
}

const flociFixture = {
	version: 'latest',
	port: 4566,
}

const createMongoDbContainer = () => new MongoDbContainer(mongoDbFixture)
const createPostgresContainer = () => new PostgresContainer(postgresFixture)
const createLocalstackContainer = () => new LocalstackContainer(localstackFixture)
const createFlociContainer = () => new FlociContainer(flociFixture)

let m: MongoDbContainer
let p: PostgresContainer
let l: LocalstackContainer
let f: FlociContainer

const cleanAll = async () => {
	await m?.stop().catch((e) => console.log(e))
	await p?.stop().catch((e) => console.log(e))
	await l?.stop().catch((e) => console.log(e))
	await f?.stop().catch((e) => console.log(e))
}

describe('docker.ts', () => {
	beforeEach(async () => {
		await cleanAll()
	})

	afterEach(async () => {
		await cleanAll()
	})

	it('should start and stop containers', async () => {
		m = createMongoDbContainer()
		p = createPostgresContainer()
		l = createLocalstackContainer()

		await Promise.all([m.start(), p.start(), l.start()])

		expect(m.startedContainer).toBeDefined()
		expect(p.startedContainer).toBeDefined()
		expect(l.startedContainer).toBeDefined()

		expect(m.getMappedPort()).toBeDefined()
		expect(p.getMappedPort()).toBeDefined()
		expect(l.getMappedPort()).toBeDefined()

		await Promise.all([m.stop(), p.stop(), l.stop()])
	})

	it('should start and stop FlociContainer', async () => {
		f = createFlociContainer()

		await f.start()

		expect(f.startedContainer).toBeDefined()
		expect(f.getMappedPort()).toBeDefined()

		await f.stop()
	})
})
