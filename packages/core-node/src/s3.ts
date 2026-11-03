import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3'
import type { AwsCredentialIdentity } from '@aws-sdk/types'
import {
	CREDENTIAL_PROVIDERS,
	type CredentialProvider,
	fromCredentialProvider,
} from './aws-credentials.js'

export { CREDENTIAL_PROVIDERS, type CredentialProvider }

export type S3Config = {
	/** AWS region (e.g., 'us-east-1') */
	region: string
	/** Credential provider for authentication */
	credentials: {
		provider: CredentialProvider
	}
	/** Custom S3 endpoint (for LocalStack, MinIO, etc.) */
	endpoint?: string
	/** Force path-style URLs (bucket.s3.amazonaws.com → s3.amazonaws.com/bucket) */
	forcePathStyle?: boolean
}

/**
 * S3 client wrapper with automatic credential refresh and connection management.
 *
 * @example
 * ```typescript
 * // ESM
 * import { S3, CREDENTIAL_PROVIDERS } from '@brrritscold/core-node/s3'
 *
 * const s3 = new S3()
 * await s3.initClient({
 *   region: 'us-east-1',
 *   credentials: { provider: CREDENTIAL_PROVIDERS.NODE_PROVIDER_CHAIN },
 * })
 *
 * const client = await s3.getClient()
 * // Use client for @aws-sdk/client-s3 operations
 * ```
 *
 * @example
 * ```typescript
 * // CJS
 * const { S3, CREDENTIAL_PROVIDERS } = require('@brrritscold/core-node/s3')
 *
 * const s3 = new S3()
 * await s3.initClient({
 *   region: 'us-east-1',
 *   credentials: { provider: CREDENTIAL_PROVIDERS.ENV },
 *   endpoint: 'http://localhost:4566', // LocalStack
 *   forcePathStyle: true,
 * })
 *
 * const client = await s3.getClient()
 * ```
 */
export class S3 {
	#config: S3ClientConfig | undefined
	#credentials: {
		tokens?: AwsCredentialIdentity
		provider?: CredentialProvider
	} = {}
	#client: S3Client | undefined

	/**
	 * Get current credentials (for debugging/inspection).
	 */
	get credentials() {
		return this.#credentials
	}

	/**
	 * Refresh AWS credentials if expired or missing.
	 *
	 * Automatically called by `getClient()` before returning the client.
	 */
	async refreshTokens(): Promise<void> {
		if (!this.#credentials.provider) {
			return
		}

		const needsRefresh =
			!this.#credentials.tokens ||
			(this.#credentials.tokens.expiration &&
				new Date(this.#credentials.tokens.expiration).getTime() < Date.now())

		if (needsRefresh) {
			this.#credentials.tokens = await fromCredentialProvider(this.#credentials.provider)
		}
	}

	/**
	 * Initialize S3 client with configuration and credentials.
	 *
	 * @param cfg - S3 configuration
	 * @returns `true` on success
	 *
	 * @throws {Error} If credential provider fails to resolve credentials
	 */
	async initClient(cfg: S3Config): Promise<boolean> {
		this.#config = {
			region: cfg.region,
			endpoint: cfg.endpoint,
			forcePathStyle: cfg.forcePathStyle,
		}

		this.#credentials.provider = cfg.credentials.provider

		await this.refreshTokens()

		this.#client = new S3Client({
			...this.#config,
			credentials: this.#credentials.tokens,
		})

		return true
	}

	/**
	 * Get S3 client with refreshed credentials.
	 *
	 * @returns S3Client instance, or `null` if not initialized
	 *
	 * @example
	 * ```typescript
	 * import { PutObjectCommand } from '@aws-sdk/client-s3'
	 *
	 * const client = await s3.getClient()
	 * if (!client) throw new Error('S3 not initialized')
	 *
	 * await client.send(new PutObjectCommand({
	 *   Bucket: 'my-bucket',
	 *   Key: 'archive/data.json',
	 *   Body: JSON.stringify({ archived: true }),
	 * }))
	 * ```
	 */
	async getClient(): Promise<S3Client | null> {
		if (!this.#client) {
			return null
		}

		await this.refreshTokens()

		// Recreate client with refreshed credentials
		this.#client = new S3Client({
			...this.#config,
			credentials: this.#credentials.tokens,
		})

		return this.#client
	}

	/**
	 * Close S3 client and clear internal state.
	 *
	 * Call this when the S3 instance is no longer needed (e.g., during Lambda shutdown).
	 *
	 * @returns `true` on success
	 */
	closeClient(): boolean {
		if (this.#client) {
			this.#client.destroy()
		}
		this.#client = undefined
		return true
	}
}
