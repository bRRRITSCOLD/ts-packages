import { JWT, type JWTConstructor } from '@brrritscold/core-node/jwt'
import { beforeAll, describe, expect, it } from 'vitest'
import { verifyJwt } from '../../src/utils/jwt.js'
// application/testee
import { setup } from './__utils__/utils.js'

describe('utils/jwt.ts', () => {
	beforeAll(async () => {
		setup()
	})

	describe('verifyJwt', () => {
		it('should verify a valid JWT and return successfully the payload id [Happy path]', async () => {
			const config: JWTConstructor = {
				algorithm: 'RS256',
				secret: process.env.JWT_SECRET!,
				id: 'test-id',
				iss: 'brrritscold',
			}

			const jwt = new JWT(config)

			const token = jwt.sign()

			expect(token).toBeDefined()
			expect(token).toBeTypeOf('string')
			expect(token.length).toBeGreaterThan(1)

			const verifyConfigs: JWTConstructor[] = [
				{
					algorithm: 'HS384',
					secret: process.env.JWT_SECRET!,
				},
				{
					algorithm: 'ES256',
					secret: 'process.env.JWT_SECRET',
				},
				{
					algorithm: 'RS256',
					secret: process.env.JWT_SECRET!,
				},
			]
			const verification = verifyJwt(token, verifyConfigs)

			expect(verification).toBeDefined()
			expect(verification.success).toBe(true)
			expect(verification.id).toBe(config.id)
		})

		it('should verify a valid JWT with the wrong algorithm and return gracefully the failure', async () => {
			const config: JWTConstructor = {
				algorithm: 'RS256',
				secret: process.env.JWT_SECRET!,
				id: 'test-id',
				iss: 'brrritscold',
			}

			const jwt = new JWT(config)

			const token = jwt.sign()

			expect(token).toBeDefined()
			expect(token).toBeTypeOf('string')
			expect(token.length).toBeGreaterThan(1)

			const verifyConfigs: JWTConstructor[] = [
				{
					algorithm: 'HS384',
					secret: process.env.JWT_SECRET!,
				},
				{
					algorithm: 'ES256',
					secret: 'process.env.JWT_SECRET',
				},
				{
					algorithm: 'HS256',
					secret: process.env.JWT_SECRET!,
				},
			]
			const verification = verifyJwt(token, verifyConfigs)

			expect(verification).toBeDefined()
			expect(verification.success).toBe(false)
		})

		it('should verify a invalid JWT with the wrong algorithm and return gracefully the failure', async () => {
			const token = 'definitely-not-a-malicious-token'

			const verifyConfigs: JWTConstructor[] = [
				{
					algorithm: 'HS384',
					secret: process.env.JWT_SECRET!,
				},
				{
					algorithm: 'ES256',
					secret: 'process.env.JWT_SECRET',
				},
				{
					algorithm: 'RS256',
					secret: process.env.JWT_SECRET!,
				},
			]
			const verification = verifyJwt(token, verifyConfigs)

			expect(verification).toBeDefined()
			expect(verification.success).toBe(false)
		})

		it('should verify an expired valid JWT and return gracefully the failure', async () => {
			const config: JWTConstructor = {
				algorithm: 'RS256',
				secret: process.env.JWT_SECRET!,
				id: 'test-id',
				iss: 'brrritscold',
				exp: -1,
			}

			const jwt = new JWT(config)

			const token = jwt.sign()

			const verifyConfigs: JWTConstructor[] = [
				{
					algorithm: 'HS384',
					secret: process.env.JWT_SECRET!,
				},
				{
					algorithm: 'ES256',
					secret: 'process.env.JWT_SECRET',
				},
				{
					algorithm: 'RS256',
					secret: process.env.JWT_SECRET!,
				},
			]
			const verification = verifyJwt(token, verifyConfigs)

			expect(verification).toBeDefined()
			expect(verification.success).toBe(false)
		})
	})
})
