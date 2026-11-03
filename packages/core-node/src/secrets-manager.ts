import { SecretsManagerClient, SecretsManagerClientConfig } from '@aws-sdk/client-secrets-manager'
import type { AwsCredentialIdentity } from '@aws-sdk/types'
import {
	CREDENTIAL_PROVIDERS,
	type CredentialProvider,
	fromCredentialProvider,
} from './aws-credentials.js'

export { CREDENTIAL_PROVIDERS, type CredentialProvider }

export type SecretsManagerConfig = {
	/** AWS region (e.g., 'us-east-1') */
	region: string
	/** Credential provider for authentication */
	credentials: {
		provider: CredentialProvider
	}
	/** Custom Secrets Manager endpoint (for LocalStack, Floci, etc.) */
	endpoint?: string
}

/**
 * Secrets Manager client wrapper with automatic credential refresh and connection management.
 *
 * @example
 * ```typescript
 * // ESM
 * import { SecretsManager, CREDENTIAL_PROVIDERS } from '@brrritscold/core-node/secrets-manager'
 *
 * const secretsManager = new SecretsManager()
 * await secretsManager.initClient({
 *   region: 'us-east-1',
 *   credentials: { provider: CREDENTIAL_PROVIDERS.NODE_PROVIDER_CHAIN },
 * })
 *
 * const client = await secretsManager.getClient()
 * // Use client for @aws-sdk/client-secrets-manager operations
 * ```
 *
 * @example
 * ```typescript
 * // CJS
 * const { SecretsManager, CREDENTIAL_PROVIDERS } = require('@brrritscold/core-node/secrets-manager')
 *
 * const secretsManager = new SecretsManager()
 * await secretsManager.initClient({
 *   region: 'us-east-1',
 *   credentials: { provider: CREDENTIAL_PROVIDERS.ENV },
 *   endpoint: 'http://localhost:4566', // LocalStack
 * })
 *
 * const client = await secretsManager.getClient()
 * ```
 */
export class SecretsManager {
	#config: SecretsManagerClientConfig | undefined
	#credentials: {
		tokens?: AwsCredentialIdentity
		provider?: CredentialProvider
	} = {}
	#client: SecretsManagerClient | undefined

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
	 * Initialize Secrets Manager client with configuration and credentials.
	 *
	 * @param cfg - Secrets Manager configuration
	 * @returns `true` on success
	 *
	 * @throws {Error} If credential provider fails to resolve credentials
	 */
	async initClient(cfg: SecretsManagerConfig): Promise<boolean> {
		this.#config = {
			region: cfg.region,
			endpoint: cfg.endpoint,
		}

		this.#credentials.provider = cfg.credentials.provider

		await this.refreshTokens()

		this.#client = new SecretsManagerClient({
			...this.#config,
			credentials: this.#credentials.tokens,
		})

		return true
	}

	/**
	 * Get Secrets Manager client with refreshed credentials.
	 *
	 * @returns SecretsManagerClient instance, or `null` if not initialized
	 *
	 * @example
	 * ```typescript
	 * import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
	 *
	 * const client = await secretsManager.getClient()
	 * if (!client) throw new Error('Secrets Manager not initialized')
	 *
	 * const { SecretString } = await client.send(new GetSecretValueCommand({
	 *   SecretId: 'my-app/credentials',
	 * }))
	 * ```
	 */
	async getClient(): Promise<SecretsManagerClient | null> {
		if (!this.#client) {
			return null
		}

		await this.refreshTokens()

		// Recreate client with refreshed credentials
		this.#client = new SecretsManagerClient({
			...this.#config,
			credentials: this.#credentials.tokens,
		})

		return this.#client
	}

	/**
	 * Close Secrets Manager client and clear internal state.
	 *
	 * Call this when the SecretsManager instance is no longer needed (e.g., during Lambda shutdown).
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
