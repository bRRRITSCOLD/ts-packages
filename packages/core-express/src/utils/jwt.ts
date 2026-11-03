// node_modules
import { JWT, type JWTConstructor } from '@brrritscold/core-node/jwt'

type JwtVerification = {
	success: boolean
	id: string
}

export const JwtVerificationFailure: JwtVerification = {
	success: false,
	id: '',
}

/**
 * Verifies that a JWT is well-formed and not expired, given some configurations.
 *
 * @param token JWT being verified.
 * @param configs JWT configurations with the secrets and algorithms used in trying
 * to decode the JWT.
 *
 * @returns An object stating if it was successfully decoded and what "id" contained,
 * within it.
 */
export function verifyJwt(token: string, configs: JWTConstructor[]): JwtVerification {
	const errors = []

	for (const config of configs) {
		try {
			const jwt: JWT = new JWT(config)

			const decipheredJwt = jwt.verify(token)

			if (
				decipheredJwt.data &&
				typeof decipheredJwt.data !== 'string' &&
				decipheredJwt.data.exp! >= Math.floor(Date.now() / 1000) && // TODO: use utcDateObject when ported to @brrritscold/core-js
				(decipheredJwt.data.id || decipheredJwt.data.clientId)
			) {
				return {
					success: true,
					id: decipheredJwt.data.id || decipheredJwt.data.clientId,
				}
			}
		} catch (err) {
			errors.push(err)
		}
	}

	return JwtVerificationFailure
}
