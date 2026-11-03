import {
	CreateSecretCommand,
	DeleteSecretCommand,
	GetSecretValueCommand,
	PutSecretValueCommand,
	ResourceNotFoundException,
} from '@aws-sdk/client-secrets-manager'
import { expect } from 'chai'
import { CREDENTIAL_PROVIDERS, SecretsManager } from '../../src/secrets-manager.js'
import { getLocalstackContainer, setup } from './__utils__/utils.js'

describe('secrets-manager.ts', () => {
	let secretsManager: SecretsManager
	let localstackContainer: Awaited<ReturnType<typeof getLocalstackContainer>>

	before(async () => {
		await setup()
		localstackContainer = await getLocalstackContainer()
	})

	after(async () => {
		secretsManager?.closeClient()
		await localstackContainer?.stop()
	})

	context('SecretsManager client initialization and operations', () => {
		describe('SecretsManager.initClient + getClient + operations + closeClient', () => {
			it('should initialize the client, perform CRUD operations on Localstack, and close the client', async () => {
				secretsManager = new SecretsManager()

				const initialized = await secretsManager.initClient({
					region: 'us-east-1',
					endpoint: `http://localhost:${localstackContainer.getMappedPort()}`,
					credentials: {
						provider: CREDENTIAL_PROVIDERS.ENV,
					},
				})

				expect(initialized).to.be.true
				expect(secretsManager.credentials.provider).to.equal(CREDENTIAL_PROVIDERS.ENV)
				expect(secretsManager.credentials.tokens).to.not.be.undefined

				const client = await secretsManager.getClient()
				expect(client).to.not.be.null

				const secretId = 'core-node/integration-test'
				const secret = { apiKey: 'abc123' }
				const updatedSecret = { apiKey: 'def456' }

				// CreateSecret
				await client!.send(
					new CreateSecretCommand({
						Name: secretId,
						SecretString: JSON.stringify(secret),
					})
				)

				// GetSecretValue
				const created = await client!.send(
					new GetSecretValueCommand({
						SecretId: secretId,
					})
				)

				expect(JSON.parse(created.SecretString!)).to.deep.equal(secret)

				// PutSecretValue
				await client!.send(
					new PutSecretValueCommand({
						SecretId: secretId,
						SecretString: JSON.stringify(updatedSecret),
					})
				)

				const updated = await client!.send(
					new GetSecretValueCommand({
						SecretId: secretId,
					})
				)

				expect(JSON.parse(updated.SecretString!)).to.deep.equal(updatedSecret)

				// DeleteSecret
				await client!.send(
					new DeleteSecretCommand({
						SecretId: secretId,
						ForceDeleteWithoutRecovery: true,
					})
				)

				// Verify deletion
				try {
					await client!.send(
						new GetSecretValueCommand({
							SecretId: secretId,
						})
					)

					expect.fail('expected the deleted secret to no longer resolve')
				} catch (error) {
					expect(error).to.be.instanceOf(ResourceNotFoundException)
				}

				const closed = secretsManager.closeClient()
				expect(closed).to.be.true
			})
		})

		describe('SecretsManager credential refresh', () => {
			it('should get client with fresh credentials', async () => {
				secretsManager = new SecretsManager()

				await secretsManager.initClient({
					region: 'us-east-1',
					endpoint: `http://localhost:${localstackContainer.getMappedPort()}`,
					credentials: {
						provider: CREDENTIAL_PROVIDERS.ENV,
					},
				})

				// Get client multiple times - should refresh credentials internally
				const client1 = await secretsManager.getClient()
				const client2 = await secretsManager.getClient()

				expect(client1).to.not.be.null
				expect(client2).to.not.be.null

				secretsManager.closeClient()
			})
		})

		describe('SecretsManager.getClient before initialization', () => {
			it('should return null', async () => {
				const uninitialized = new SecretsManager()

				expect(await uninitialized.getClient()).to.be.null
			})
		})
	})
})
