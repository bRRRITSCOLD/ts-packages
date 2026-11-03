import { JWT } from '@brrritscold/core-node/jwt'
import { expect } from 'chai'
import type { Response } from 'express'
import sinon from 'sinon'
import { JwtMiddlewareException, JwtMidExceptionMessages } from '../../../src/lib/error.js'
import { type JwtMiddlewareRequest, jwtMiddleware } from '../../../src/lib/middlewares/jwt.js'
import { setup } from '../__utils__/utils.js'

describe('middlewares/jwt.ts ', () => {
	before(async () => {
		await setup()
	})

	after(async () => {})

	it('should return from happy path without erroring.', async () => {
		const testJwt = new JWT({
			id: process.env.JWT_ID!,
			secret: process.env.JWT_SECRET!,
			algorithm: 'RS256',
		})
		const mockRequest: Partial<JwtMiddlewareRequest> = {
			headers: { authorization: `Bearer ${testJwt.sign()}` },
			jwtPayload: { id: '' },
		}
		const mockResponse: Partial<Response> = { json: sinon.fake() }
		const nextFunction = sinon.spy()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction.calledOnce).to.be.true
		expect(nextFunction.args.length).to.be.eq(1)
		expect(nextFunction.args[0].length).to.be.eq(0)
		expect(mockRequest.jwtPayload?.id).to.be.eq(process.env.JWT_ID!)
	})

	it('should detect the empty headers and return an error.', async () => {
		const mockRequest: Partial<JwtMiddlewareRequest> = {
			jwtPayload: { id: '' },
		}
		const mockResponse: Partial<Response> = { json: sinon.fake() }
		const nextFunction = sinon.spy()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction.calledOnce).to.be.true
		expect(nextFunction.args.length).to.be.eq(1)
		expect(nextFunction.args[0].length).to.be.eq(1)
		expect(nextFunction.args[0][0] instanceof JwtMiddlewareException).to.be.true
		expect(nextFunction.args[0][0].message).to.be.eq(JwtMidExceptionMessages.MISSING_HEADER)
		expect(nextFunction.args[0][0].statusCode).to.be.eq(401)
		expect(mockRequest.jwtPayload?.id).to.be.eq('')
	})

	it('should detect the missing authorization header and return an error.', async () => {
		const mockRequest: Partial<JwtMiddlewareRequest> = {
			headers: { not_authorization: 'Bearer randomJWTvalue' },
			jwtPayload: { id: '' },
		}
		const mockResponse: Partial<Response> = { json: sinon.fake() }
		const nextFunction = sinon.spy()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction.calledOnce).to.be.true
		expect(nextFunction.args.length).to.be.eq(1)
		expect(nextFunction.args[0].length).to.be.eq(1)
		expect(nextFunction.args[0][0] instanceof JwtMiddlewareException).to.be.true
		expect(nextFunction.args[0][0].message).to.be.eq(JwtMidExceptionMessages.MISSING_HEADER)
		expect(nextFunction.args[0][0].statusCode).to.be.eq(401)
		expect(mockRequest.jwtPayload?.id).to.be.eq('')
	})

	it('should detect the missing "Bearer" within authorization header and return error.', async () => {
		const testJwt = new JWT({
			id: process.env.JWT_ID!,
			secret: process.env.JWT_SECRET!,
			algorithm: 'RS256',
		})
		const mockRequest: Partial<JwtMiddlewareRequest> = {
			headers: { authorization: `Not_Bearer ${testJwt.sign()}` },
			jwtPayload: { id: '' },
		}
		const mockResponse: Partial<Response> = { json: sinon.fake() }
		const nextFunction = sinon.spy()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction.calledOnce).to.be.true
		expect(nextFunction.args.length).to.be.eq(1)
		expect(nextFunction.args[0].length).to.be.eq(1)
		expect(nextFunction.args[0][0] instanceof JwtMiddlewareException).to.be.true
		expect(nextFunction.args[0][0].message).to.be.eq(JwtMidExceptionMessages.INVALID_BEARER)
		expect(nextFunction.args[0][0].statusCode).to.be.eq(401)
		expect(mockRequest.jwtPayload?.id).to.be.eq('')
	})

	it('should detect the missing JWT within authorization header and return error.', async () => {
		const mockRequest: Partial<JwtMiddlewareRequest> = {
			headers: { authorization: 'Bearer' },
			jwtPayload: { id: '' },
		}
		const mockResponse: Partial<Response> = { json: sinon.fake() }
		const nextFunction = sinon.spy()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction.calledOnce).to.be.true
		expect(nextFunction.args.length).to.be.eq(1)
		expect(nextFunction.args[0].length).to.be.eq(1)
		expect(nextFunction.args[0][0] instanceof JwtMiddlewareException).to.be.true
		expect(nextFunction.args[0][0].message).to.be.eq(JwtMidExceptionMessages.INVALID_BEARER)
		expect(nextFunction.args[0][0].statusCode).to.be.eq(401)
		expect(mockRequest.jwtPayload?.id).to.be.eq('')
	})

	it('should detect the invalid JWT within authorization header and return error.', async () => {
		const mockRequest: Partial<JwtMiddlewareRequest> = {
			headers: { authorization: 'Bearer randomJWTvalue' },
			jwtPayload: { id: '' },
		}
		const mockResponse: Partial<Response> = { json: sinon.fake() }
		const nextFunction = sinon.spy()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction.calledOnce).to.be.true
		expect(nextFunction.args.length).to.be.eq(1)
		expect(nextFunction.args[0].length).to.be.eq(1)
		expect(nextFunction.args[0][0] instanceof JwtMiddlewareException).to.be.true
		expect(nextFunction.args[0][0].message).to.be.eq(JwtMidExceptionMessages.INVALID_JWT)
		expect(nextFunction.args[0][0].statusCode).to.be.eq(401)
		expect(mockRequest.jwtPayload?.id).to.be.eq('')
	})
})
