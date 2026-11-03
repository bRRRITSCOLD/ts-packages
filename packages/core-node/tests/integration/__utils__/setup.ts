import { getMongoDbContainer, setup } from './utils.js'

await setup()

const mongoDbContainer = await getMongoDbContainer()

console.log(
	`[INTEGRATION TESTS SETUP COMPLETE]: ${JSON.stringify({ mongodb: { port: mongoDbContainer.getMappedPort() } })}\n`
)
