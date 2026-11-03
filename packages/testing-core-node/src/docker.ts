import { GenericContainer, StartedTestContainer, Wait, WaitStrategy } from 'testcontainers'

const labels = { application: 'brrritscold-testing-core-node' }

/**
 * @example
 * // node_modules
 * import { Container } from '@brrritscold/testing-core-node/docker'
 *
 * // or
 * import { docker } from '@brrritscold/testing-core-node'
 *
 * const { Container } = docker
 *
 * const container = new Container({
 *     image: `mongo`,
 *     port:  27017,
 *     environment: {
 *         MONGO_INITDB_ROOT_USERNAME: 'user',
 *         MONGO_INITDB_ROOT_PASSWORD: '123abc',
 *         MONGO_INITDB_DATABASE: 'testDb'
 *     }
 * })
 *
 * await container.start()
 *
 * console.log(container.getMappedPort())
 * // 27017
 *
 * await container.stop()
 */
export class Container {
	container?: GenericContainer
	startedContainer?: StartedTestContainer
	exposedPort: number

	constructor(params: {
		image: string
		port: number
		environment: Record<string, string>
		waitStrategy?: WaitStrategy
		reuse?: boolean
	}) {
		this.exposedPort = params.port
		this.container = new GenericContainer(params.image)
			.withLabels(labels)
			.withExposedPorts(this.exposedPort)
			.withEnvironment(params.environment)

		if (params.reuse ?? true) this.container = this.container.withReuse()

		if (params.waitStrategy)
			this.container = this.container.withWaitStrategy(params.waitStrategy)
	}

	async start() {
		this.startedContainer = await this.container?.start()
	}

	async stop() {
		await this.startedContainer?.stop()

		this.startedContainer = undefined
	}

	getMappedPort() {
		return this.startedContainer?.getMappedPort(this.exposedPort)
	}
}

/**
 * @example
 * // node_modules
 * import { MongoDbContainer } from '@brrritscold/testing-core-node/docker'
 *
 * // or
 * import { docker } from '@brrritscold/testing-core-node'
 *
 * const { MongoDbContainer } = docker
 *
 * const mongoDbContainer = new MongoDbContainer({
 *     username: process.env.USERNAME,
 *     password: process.env.PASSWORD,
 *     database: process.env.DATABASE
 * })
 *
 * await mongoDbContainer.start()
 *
 * console.log(mongoDbContainer.getMappedPort())
 * // 27017
 *
 * await mongoDbContainer.stop()
 */
export class MongoDbContainer extends Container {
	constructor(params: {
		version?: string
		username: string
		password: string
		database: string
		port?: number
	}) {
		super({
			image: `mongo${params.version ? `:${params.version}` : ''}`,
			port: params.port || 27017,
			environment: {
				MONGO_INITDB_ROOT_USERNAME: params.username,
				MONGO_INITDB_ROOT_PASSWORD: params.password,
				MONGO_INITDB_DATABASE: params.database,
			},
		})
	}
}

/**
 * MongoDB Atlas Local - mongod bundled with the `mongot` search process, so
 * Atlas Search (`createSearchIndex`, `$search`) works locally.
 *
 * Use this instead of `MongoDbContainer` only for suites that exercise search;
 * community `mongo` does not implement `$search` and is faster to start.
 *
 * Two things differ from `MongoDbContainer` and will bite otherwise:
 *
 * 1. The image's env vars are `MONGODB_INITDB_*`, not `MONGO_INITDB_*`.
 * 2. Atlas Local is a single-node replica set that advertises its own container
 *    hostname, so a client must connect with `directConnection=true` or server
 *    selection fails with `getaddrinfo ENOTFOUND <container id>`. Use
 *    `getConnectionString()` rather than assembling a URI from parts.
 *
 * Readiness is taken from the image's own healthcheck, which covers both mongod
 * and the search process - an open port does not mean search is usable.
 *
 * Container reuse is off by default here, unlike every other container in this
 * file. A reused container keeps its search indexes, and a suite that creates an
 * index guarded by `listSearchIndexes` would then silently no-op against state
 * left behind by an earlier run - passing for the wrong reason. This only bites
 * when a previous run died before `stop()`, but that is exactly when a green
 * suite is least trustworthy. Pass `reuse: true` to trade that for a faster start.
 *
 * @example
 * // node_modules
 * import { MongoDbAtlasLocalContainer } from '@brrritscold/testing-core-node/docker'
 *
 * const mongoDbAtlasLocalContainer = new MongoDbAtlasLocalContainer({
 *     username: process.env.USERNAME,
 *     password: process.env.PASSWORD,
 *     database: process.env.DATABASE
 * })
 *
 * await mongoDbAtlasLocalContainer.start()
 *
 * console.log(mongoDbAtlasLocalContainer.getMappedPort())
 * // 27017
 *
 * console.log(mongoDbAtlasLocalContainer.getConnectionString())
 * // mongodb://user:123abc@localhost:32768/?directConnection=true
 *
 * // after creating a search index, before querying it
 * await MongoDbAtlasLocalContainer.waitForSearchIndex(collection, 'entries-search-v1')
 *
 * await mongoDbAtlasLocalContainer.stop()
 */
export class MongoDbAtlasLocalContainer extends Container {
	username: string
	password: string
	database: string

	constructor(params: {
		version?: string
		username: string
		password: string
		database: string
		port?: number
		reuse?: boolean
	}) {
		super({
			image: `mongodb/mongodb-atlas-local${params.version ? `:${params.version}` : ''}`,
			port: params.port || 27017,
			environment: {
				MONGODB_INITDB_ROOT_USERNAME: params.username,
				MONGODB_INITDB_ROOT_PASSWORD: params.password,
				MONGODB_INITDB_DATABASE: params.database,
			},
			waitStrategy: Wait.forHealthCheck(),
			reuse: params.reuse ?? false,
		})

		this.username = params.username
		this.password = params.password
		this.database = params.database
	}

	/**
	 * Waits until an Atlas Search index exists and is queryable.
	 *
	 * `createSearchIndex` returns as soon as the request is accepted - the index
	 * builds asynchronously, so a test that creates an index and immediately runs
	 * `$search` against it will flake. Locally the build is fast (sub-second for a
	 * small collection) but it is never zero.
	 *
	 * Static because it polls a collection the caller already has, not container
	 * state - but it lives here because Atlas Local is the only image in this file
	 * that has search indexes to wait on.
	 *
	 * `collection` is typed structurally rather than as a mongodb `Collection`, so
	 * this library takes no runtime dependency on the driver. A real collection
	 * satisfies it.
	 *
	 * @example
	 * await collection.createSearchIndex({ name: 'entries-search-v1', definition: { mappings: { dynamic: true } } })
	 * await MongoDbAtlasLocalContainer.waitForSearchIndex(collection, 'entries-search-v1')
	 */
	static async waitForSearchIndex(
		collection: {
			listSearchIndexes(name?: string): {
				toArray(): Promise<{ name?: string; status?: string; queryable?: boolean }[]>
			}
		},
		name: string,
		options?: { timeoutMs?: number; intervalMs?: number }
	) {
		const timeoutMs = options?.timeoutMs ?? 60_000
		const intervalMs = options?.intervalMs ?? 250
		const deadline = Date.now() + timeoutMs

		for (;;) {
			const [index] = await collection.listSearchIndexes(name).toArray()

			if (index?.queryable) return index

			if (index?.status === 'FAILED') {
				throw new Error(`search index "${name}" failed to build`)
			}

			if (Date.now() >= deadline) {
				throw new Error(
					`search index "${name}" was not queryable within ${timeoutMs}ms (status: ${index?.status ?? 'not found'})`
				)
			}

			await new Promise((resolve) => setTimeout(resolve, intervalMs))
		}
	}

	/**
	 * Connection string for the started container, including the
	 * `directConnection=true` Atlas Local requires.
	 */
	getConnectionString() {
		const credentials = `${encodeURIComponent(this.username)}:${encodeURIComponent(this.password)}`

		return `mongodb://${credentials}@localhost:${this.getMappedPort()}/?directConnection=true`
	}
}

/**
 * @example
 * // node_modules
 * import { PostgresContainer } from '@brrritscold/testing-core-node/docker'
 *
 * // or
 * import { docker } from '@brrritscold/testing-core-node'
 *
 * const { PostgresContainer } = docker
 *
 * const postgresContainer = new PostgresContainer({
 *     username: process.env.USERNAME,
 *     password: process.env.PASSWORD,
 *     database: process.env.DATABASE
 * })
 *
 * await postgresContainer.start()
 *
 * console.log(postgresContainer.getMappedPort())
 * // 5432
 *
 * await postgresContainer.stop()
 */
export class PostgresContainer extends Container {
	constructor(params: {
		version?: string
		username: string
		password: string
		database: string
		port?: number
	}) {
		super({
			image: `postgres${params.version ? `:${params.version}` : ''}`,
			port: params.port || 5432,
			environment: {
				POSTGRES_USER: params.username,
				POSTGRES_PASSWORD: params.password,
				POSTGRES_DB: params.database,
			},
		})
	}
}

/**
 * @example
 * // node_modules
 * import { LocalstackContainer } from '@brrritscold/testing-core-node/docker'
 *
 * // or
 * import { docker } from '@brrritscold/testing-core-node'
 *
 * const { LocalstackContainer } = docker
 *
 * const localstackContainer = new LocalstackContainer({
 *     services: 'secretsmanager,
 *     defaultRegion: 'us-east-1
 * })
 *
 * await localstackContainer.start()
 *
 * console.log(localstackContainer.getMappedPort())
 * // 4566
 *
 * await localstackContainer.stop()
 */
export class LocalstackContainer extends Container {
	constructor(params: {
		version?: string
		services: string
		defaultRegion: string
		port?: number
	}) {
		super({
			image: `localstack/localstack${params.version ? `:${params.version}` : ''}`,
			port: params.port || 4566,
			environment: {
				SERVICES: params.services,
				DEFAULT_REGION: params.defaultRegion,
			},
		})
	}
}

/**
 * Floci - Fake Local Cloud Infrastructure (AWS services emulator).
 *
 * Lightweight alternative to LocalStack for testing AWS services (S3, SQS, DynamoDB, etc.).
 * Provides an AWS-compatible HTTP API on port 4566.
 *
 * @see https://floci.io/
 *
 * @example
 * // node_modules
 * import { FlociContainer } from '@brrritscold/testing-core-node/docker'
 *
 * // or
 * import { docker } from '@brrritscold/testing-core-node'
 *
 * const { FlociContainer } = docker
 *
 * const flociContainer = new FlociContainer()
 *
 * await flociContainer.start()
 *
 * console.log(flociContainer.getMappedPort())
 * // 4566
 *
 * // Use with AWS SDK S3 client:
 * // endpoint: `http://localhost:${flociContainer.getMappedPort()}`
 * // forcePathStyle: true
 * // region: 'us-east-1'
 * // credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
 *
 * await flociContainer.stop()
 */
export class FlociContainer extends Container {
	constructor(params?: { version?: string; port?: number }) {
		super({
			image: `floci/floci${params?.version ? `:${params.version}` : ''}`,
			port: params?.port || 4566,
			environment: {},
		})
	}
}
