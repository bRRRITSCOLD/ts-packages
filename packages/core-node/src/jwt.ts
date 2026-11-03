// node_modules
import jwt, { Algorithm, JsonWebTokenError } from 'jsonwebtoken'

/** Signing algorithm accepted by `jsonwebtoken`, such as `HS256` or `RS256`. */
export type JWTAlgorithm = Algorithm

/** Options for constructing a `JWT`; only `secret` and `algorithm` are required, the rest fall back to defaults. */
export type JWTConstructor = {
	id?: string
	aud?: string
	iss?: string
	secret: string
	algorithm: JWTAlgorithm
	exp?: number
}

/** Claims embedded in a token produced by `JWT.sign`. */
export type JWTPayload = {
	iss: string
	iat: string
	exp: number
	aud: string
	sub: string
	id: string
}

/** Fully resolved `JWT` settings, with every optional constructor field filled in by its default. */
export type JWTConfig = Required<JWTConstructor>

/**
 * Signs, verifies and decodes JSON Web Tokens with a fixed secret and algorithm, issuing tokens that expire after 24 hours by default.
 *
 * @example
 * ///////////////
 * ///// CJS /////
 * ///////////////
 * const { JWT } = require('@brrritscold/core-node/jwt')
 *
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { JWT } from '@brrritscold/core-node/jwt'
 *
 * const time = JWT({
 *    secret: process.env.SECRET,
 *    algorithm: 'RS256'
 * })
 *
 * const token = jwt.sign()
 * console.log(token) // eUHFE8UWHFUWNFJWNEFWOFKWOKF.....
 *
 * const decodedToken = jwt.decod(token)
 * console.log(decodedToken) // { iss, ... }
 *
 * const verifiedToken = jwt.verify(token)
 * console.log(verifiedToken) // { iss, ... }
 */
export class JWT {
	#config: JWTConfig

	constructor(params: JWTConstructor) {
		this.#config = {
			id: params.id ?? '@brrritscold/core-node',
			aud: params.aud ?? 'unknown',
			iss: params.iss ?? '@brrritscold/core-node',
			secret: params.secret,
			algorithm: params.algorithm,
			exp: params.exp ?? 86400, // 24 hours after the issued date
		}
	}

	get config(): JWTConfig {
		return this.#config
	}

	sign() {
		const iat = Math.floor(Date.now() / 1000) // time now in seconds
		const exp = iat + this.#config.exp

		const tokenPayload = {
			iss: this.#config.iss, // Your application information
			iat: iat, // Timestamp that token has been generated
			exp: exp, // Expiration date that token will be expired
			aud: this.#config.aud, // your website domain
			sub: 'v1 security', // no need to change
			id: this.#config.id, // Your client id that we have passed related client information
		}

		const token = jwt.sign(tokenPayload, this.#config.secret, {
			algorithm: this.#config.algorithm,
		})

		return token
	}

	verify(token: string) {
		let error
		let data
		try {
			data = jwt.verify(token, this.#config.secret, {
				algorithms: [this.#config.algorithm],
			})
		} catch (err) {
			error = err as JsonWebTokenError
		}

		return {
			data,
			error,
		}
	}

	decode(token: string) {
		const verifiedToken = jwt.decode(token)

		return verifiedToken as string | jwt.JwtPayload | JWTPayload | null
	}
}
