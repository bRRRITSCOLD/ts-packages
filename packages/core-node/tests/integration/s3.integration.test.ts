import {
	_Object,
	CreateBucketCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
} from '@aws-sdk/client-s3'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CREDENTIAL_PROVIDERS, S3 } from '../../src/s3.js'
import { getFlociContainer } from './__utils__/utils.js'

describe('s3.ts', () => {
	let s3: S3
	let flociContainer: Awaited<ReturnType<typeof getFlociContainer>>

	beforeAll(async () => {
		flociContainer = await getFlociContainer()
	})

	afterAll(async () => {
		await s3?.closeClient()
		await flociContainer?.stop()
	})

	describe('S3 client initialization and operations', () => {
		describe('S3.initClient + S3.getClient + S3 operations + S3.closeClient', () => {
			it('should initialize S3 client, perform CRUD operations on Floci, and close client', async () => {
				s3 = new S3()

				// Initialize with Floci endpoint
				const initialized = await s3.initClient({
					region: 'us-east-1',
					endpoint: `http://localhost:${flociContainer.getMappedPort()}`,
					forcePathStyle: true,
					credentials: {
						provider: CREDENTIAL_PROVIDERS.ENV,
					},
				})

				expect(initialized).toBe(true)
				expect(s3.credentials.provider).toBe(CREDENTIAL_PROVIDERS.ENV)
				expect(s3.credentials.tokens).toBeDefined()

				// Get S3 client
				const client = await s3.getClient()
				expect(client).not.toBeNull()

				// Test bucket + object key
				const testBucket = 'test-bucket'
				const testKey = 'test-data.json'
				const testData = { message: 'S3 integration test', timestamp: Date.now() }

				// Create bucket
				await client!.send(
					new CreateBucketCommand({
						Bucket: testBucket,
					})
				)

				// PutObject
				await client!.send(
					new PutObjectCommand({
						Bucket: testBucket,
						Key: testKey,
						Body: JSON.stringify(testData),
						ContentType: 'application/json',
					})
				)

				// GetObject
				const getResult = await client!.send(
					new GetObjectCommand({
						Bucket: testBucket,
						Key: testKey,
					})
				)

				expect(getResult.Body).toBeDefined()
				const bodyText = await getResult.Body!.transformToString()
				const retrieved = JSON.parse(bodyText)
				expect(retrieved.message).toBe(testData.message)
				expect(retrieved.timestamp).toBe(testData.timestamp)

				// ListObjectsV2
				const listResult = await client!.send(
					new ListObjectsV2Command({
						Bucket: testBucket,
					})
				)

				expect(listResult.Contents).toBeDefined()
				expect(listResult.Contents).toHaveLength(1)
				expect(listResult.Contents![0].Key).toBe(testKey)

				// DeleteObject
				await client!.send(
					new DeleteObjectCommand({
						Bucket: testBucket,
						Key: testKey,
					})
				)

				// Verify deletion
				const listAfterDelete = await client!.send(
					new ListObjectsV2Command({
						Bucket: testBucket,
					})
				)

				expect(listAfterDelete.Contents).toSatisfy(
					(contents: _Object[] | undefined) => !contents || contents.length === 0
				)

				// Close client
				const closed = s3.closeClient()
				expect(closed).toBe(true)
			})
		})

		describe('S3 credential refresh', () => {
			it('should get client with fresh credentials', async () => {
				s3 = new S3()

				await s3.initClient({
					region: 'us-east-1',
					endpoint: `http://localhost:${flociContainer.getMappedPort()}`,
					forcePathStyle: true,
					credentials: {
						provider: CREDENTIAL_PROVIDERS.ENV,
					},
				})

				// Get client multiple times - should refresh credentials internally
				const client1 = await s3.getClient()
				const client2 = await s3.getClient()

				// Both clients should be valid S3Client instances
				expect(client1).not.toBeNull()
				expect(client2).not.toBeNull()

				s3.closeClient()
			})
		})
	})
})
