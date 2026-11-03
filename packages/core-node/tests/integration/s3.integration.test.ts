import {
	_Object,
	CreateBucketCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
} from '@aws-sdk/client-s3'
import { expect } from 'chai'
import { CREDENTIAL_PROVIDERS, S3 } from '../../src/s3.js'
import { getFlociContainer, setup } from './__utils__/utils.js'

describe('s3.ts', () => {
	let s3: S3
	let flociContainer: Awaited<ReturnType<typeof getFlociContainer>>

	before(async () => {
		await setup()
		flociContainer = await getFlociContainer()
	})

	after(async () => {
		await s3?.closeClient()
		await flociContainer?.stop()
	})

	context('S3 client initialization and operations', () => {
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

				expect(initialized).to.be.true
				expect(s3.credentials.provider).to.equal(CREDENTIAL_PROVIDERS.ENV)
				expect(s3.credentials.tokens).to.not.be.undefined

				// Get S3 client
				const client = await s3.getClient()
				expect(client).to.not.be.null

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

				expect(getResult.Body).to.not.be.undefined
				const bodyText = await getResult.Body!.transformToString()
				const retrieved = JSON.parse(bodyText)
				expect(retrieved.message).to.equal(testData.message)
				expect(retrieved.timestamp).to.equal(testData.timestamp)

				// ListObjectsV2
				const listResult = await client!.send(
					new ListObjectsV2Command({
						Bucket: testBucket,
					})
				)

				expect(listResult.Contents).to.not.be.undefined
				expect(listResult.Contents).to.have.lengthOf(1)
				expect(listResult.Contents![0].Key).to.equal(testKey)

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

				expect(listAfterDelete.Contents).to.satisfy(
					(contents: _Object[] | undefined) => !contents || contents.length === 0
				)

				// Close client
				const closed = s3.closeClient()
				expect(closed).to.be.true
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
				expect(client1).to.not.be.null
				expect(client2).to.not.be.null

				s3.closeClient()
			})
		})
	})
})
