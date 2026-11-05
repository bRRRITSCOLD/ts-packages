import crypto from 'crypto'
import { JsonWebTokenError } from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'

// application/testee
import { JWT, JWTPayload } from '../../src/jwt.js'

describe('jwt.ts', () => {
	describe('JWT', () => {
		it('should sign, decode and verify a token (valid token - HS256)', async () => {
			const config = {
				algorithm: 'HS256' as const,
				secret: 'SUPER_SECRET',
				id: 'test-id',
				iss: 'brrritscold',
			}

			const jwt = new JWT(config)

			const token = jwt.sign()

			expect(token).toBeDefined()
			expect(token).toBeTypeOf('string')
			expect(token.length).toBeGreaterThan(1)

			const decodedToken = jwt.decode(token) as JWTPayload

			expect(decodedToken).toBeDefined()
			expect(decodedToken.id).toBeDefined()
			expect(decodedToken.id).toBe(config.id)

			const verifiedToken = jwt.verify(token)

			expect(verifiedToken).toBeDefined()
			expect(verifiedToken.error).toBeUndefined()
			expect(verifiedToken.data).toBeDefined()
			expect((verifiedToken.data as unknown as JWTPayload).id).toBeDefined()
			expect((verifiedToken.data as unknown as JWTPayload).id).toBe(config.id)
		})

		it('should sign, decode and verify a token (valid token - RS256)', async () => {
			// generate keys
			const keys = crypto.generateKeyPairSync('rsa', {
				modulusLength: 2048,
				publicKeyEncoding: {
					type: 'spki',
					format: 'pem',
				},
				privateKeyEncoding: {
					type: 'pkcs8',
					format: 'pem',
				},
			})

			// create config to sign jwt with private key
			const configPrivateKey = {
				algorithm: 'RS256' as const,
				secret: keys.privateKey,
				id: 'test-id',
				iss: 'brrritscold',
			}

			const jwtPrivateKey = new JWT(configPrivateKey)

			const token = jwtPrivateKey.sign()

			expect(token).toBeDefined()
			expect(token).toBeTypeOf('string')
			expect(token.length).toBeGreaterThan(1)

			// create jwt to verify with public key
			const jwtPublicKey = new JWT({
				...configPrivateKey,
				secret: keys.publicKey,
			})

			const decodedToken = jwtPublicKey.decode(token) as JWTPayload

			expect(decodedToken).toBeDefined()
			expect(decodedToken.id).toBeDefined()
			expect(decodedToken.id).toBe(configPrivateKey.id)

			const verifiedToken = jwtPublicKey.verify(token)

			expect(verifiedToken).toBeDefined()
			expect(verifiedToken.error).toBeUndefined()
			expect(verifiedToken.data).toBeDefined()
			expect((verifiedToken.data as unknown as JWTPayload).id).toBeDefined()
			expect((verifiedToken.data as unknown as JWTPayload).id).toBe(configPrivateKey.id)
		})

		it('should verify a token (invalid token - HS256)', async () => {
			const config = {
				algorithm: 'HS256' as const,
				secret: 'SUPER_SECRET',
				id: 'test-id',
				iss: 'brrritscold',
			}

			const jwt = new JWT(config)

			const verifiedToken = jwt.verify('afnasjdfnjasndfjknas')

			expect(verifiedToken).toBeDefined()
			expect(verifiedToken.data).toBeUndefined()
			expect(verifiedToken.error).toBeDefined()
			expect((verifiedToken.error as unknown as JsonWebTokenError).name).toBe(
				'JsonWebTokenError'
			)
		})
	})
})
