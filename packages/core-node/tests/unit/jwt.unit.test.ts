import { expect } from 'chai'
import crypto from 'crypto'
import { JsonWebTokenError } from 'jsonwebtoken'

// application/testee
import { JWT, JWTPayload } from '../../src/jwt.js'

describe('jwt.ts', () => {
	before(async () => {})

	after(async () => {})

	beforeEach(async () => {})

	afterEach(async () => {})

	context('JWT', () => {
		it('should sign, decode and verify a token (valid token - HS256)', async () => {
			const config = {
				algorithm: 'HS256' as const,
				secret: 'SUPER_SECRET',
				id: 'test-id',
				iss: 'brrritscold',
			}

			const jwt = new JWT(config)

			const token = jwt.sign()

			expect(token).to.be.not.undefined
			expect(typeof token === 'string').to.be.true
			expect(token).to.have.length.greaterThan(1)

			const decodedToken = jwt.decode(token) as JWTPayload

			expect(decodedToken).to.be.not.undefined
			expect(decodedToken.id).to.be.not.undefined
			expect(decodedToken.id).to.eq(config.id)

			const verifiedToken = jwt.verify(token)

			expect(verifiedToken).to.be.not.undefined
			expect(verifiedToken.error).to.be.undefined
			expect(verifiedToken.data).to.be.not.undefined
			expect((verifiedToken.data as unknown as JWTPayload).id).to.be.not.undefined
			expect((verifiedToken.data as unknown as JWTPayload).id).to.eq(config.id)
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

			expect(token).to.be.not.undefined
			expect(typeof token === 'string').to.be.true
			expect(token).to.have.length.greaterThan(1)

			// create jwt to verify with public key
			const jwtPublicKey = new JWT({
				...configPrivateKey,
				secret: keys.publicKey,
			})

			const decodedToken = jwtPublicKey.decode(token) as JWTPayload

			expect(decodedToken).to.be.not.undefined
			expect(decodedToken.id).to.be.not.undefined
			expect(decodedToken.id).to.eq(configPrivateKey.id)

			const verifiedToken = jwtPublicKey.verify(token)

			expect(verifiedToken).to.be.not.undefined
			expect(verifiedToken.error).to.be.undefined
			expect(verifiedToken.data).to.be.not.undefined
			expect((verifiedToken.data as unknown as JWTPayload).id).to.be.not.undefined
			expect((verifiedToken.data as unknown as JWTPayload).id).to.eq(configPrivateKey.id)
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

			expect(verifiedToken).to.be.not.undefined
			expect(verifiedToken.data).to.be.undefined
			expect(verifiedToken.error).to.be.not.undefined
			expect((verifiedToken.error as unknown as JsonWebTokenError).name).to.eq(
				'JsonWebTokenError'
			)
		})
	})
})
