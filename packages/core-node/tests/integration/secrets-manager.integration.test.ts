import {
	CreateSecretCommand,
	DeleteSecretCommand,
	GetSecretValueCommand,
	PutSecretValueCommand,
	ResourceNotFoundException,
} from '@aws-sdk/client-secrets-manager'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CREDENTIAL_PROVIDERS, SecretsManager } from '../../src/secrets-manager.js'
import { getLocalstackContainer } from './__utils__/utils.js'

describe('secrets-manager.ts', () => {
	let secretsManager: SecretsManager
	let localstackContainer: Awaited<ReturnType<typeof getLocalstackContainer>>

	beforeAll(async () => {
		localstackContainer = await getLocalstackContainer()
	})

	afterAll(async () => {
		secretsManager?.closeClient()
		await localstackContainer?.stop()
	})

	describe('SecretsManager client initialization and operations', () => {
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

				expect(initialized).toBe(true)
				expect(secretsManager.credentials.provider).toBe(CREDENTIAL_PROVIDERS.ENV)
				expect(secretsManager.credentials.tokens).toBeDefined()

				const client = await secretsManager.getClient()
				expect(client).not.toBeNull()

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

				expect(JSON.parse(created.SecretString!)).toStrictEqual(secret)

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

				expect(JSON.parse(updated.SecretString!)).toStrictEqual(updatedSecret)

				// DeleteSecret
				await client!.send(
					new DeleteSecretCommand({
						SecretId: secretId,
						ForceDeleteWithoutRecovery: true,
					})
				)

				// Verify deletion
				await expect(
					client!.send(
						new GetSecretValueCommand({
							SecretId: secretId,
						})
					)
				).rejects.toBeInstanceOf(ResourceNotFoundException)

				const closed = secretsManager.closeClient()
				expect(closed).toBe(true)
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

				expect(client1).not.toBeNull()
				expect(client2).not.toBeNull()

				secretsManager.closeClient()
			})
		})

		describe('SecretsManager.getClient before initialization', () => {
			it('should return null', async () => {
				const uninitialized = new SecretsManager()

				expect(await uninitialized.getClient()).toBeNull()
			})
		})
	})
})
