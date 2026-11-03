import { fromEnv, fromNodeProviderChain } from '@aws-sdk/credential-providers'
import type { AwsCredentialIdentity } from '@aws-sdk/types'

/**
 * Available AWS credential providers for client authentication.
 *
 * - `ENV`: Load credentials from environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - `NODE_PROVIDER_CHAIN`: Use AWS SDK default provider chain (env vars → EC2 instance metadata → ECS task role)
 */
export const CREDENTIAL_PROVIDERS = Object.freeze({
	ENV: 'fromEnv',
	NODE_PROVIDER_CHAIN: 'fromNodeProviderChain',
} as const)

export type CredentialProvider = (typeof CREDENTIAL_PROVIDERS)[keyof typeof CREDENTIAL_PROVIDERS]

/**
 * Resolve AWS credentials from specified provider.
 *
 * @param provider - Credential provider name
 * @returns AWS credential identity with access key, secret, and optional session token
 */
export async function fromCredentialProvider(
	provider: CredentialProvider
): Promise<AwsCredentialIdentity> {
	switch (provider) {
		case CREDENTIAL_PROVIDERS.ENV:
			return await fromEnv()()
		case CREDENTIAL_PROVIDERS.NODE_PROVIDER_CHAIN:
			return await fromNodeProviderChain()()
		default: {
			// Exhaustiveness check - TypeScript ensures we handled all cases
			const _exhaustive: never = provider
			throw new Error(`Unknown credential provider: ${_exhaustive}`)
		}
	}
}
