import { JWT } from '@brrritscold/core-node/jwt'
import type { Response } from 'express'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { JwtMiddlewareException, JwtMidExceptionMessages } from '../../../src/error.js'
import { type JwtMiddlewareRequest, jwtMiddleware } from '../../../src/middlewares/jwt.js'
import { setup } from '../__utils__/utils.js'

describe('middlewares/jwt.ts ', () => {
	beforeAll(async () => {
		await setup()
	})

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
		const mockResponse: Partial<Response> = { json: vi.fn() }
		const nextFunction = vi.fn()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction).toHaveBeenCalledExactlyOnceWith()
		expect(mockRequest.jwtPayload?.id).toBe(process.env.JWT_ID!)
	})

	it('should detect the empty headers and return an error.', async () => {
		const mockRequest: Partial<JwtMiddlewareRequest> = {
			jwtPayload: { id: '' },
		}
		const mockResponse: Partial<Response> = { json: vi.fn() }
		const nextFunction = vi.fn()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction).toHaveBeenCalledExactlyOnceWith(expect.any(JwtMiddlewareException))
		expect(nextFunction.mock.calls[0][0]).toMatchObject({
			message: JwtMidExceptionMessages.MISSING_HEADER,
			statusCode: 401,
		})
		expect(mockRequest.jwtPayload?.id).toBe('')
	})

	it('should detect the missing authorization header and return an error.', async () => {
		const mockRequest: Partial<JwtMiddlewareRequest> = {
			headers: { not_authorization: 'Bearer randomJWTvalue' },
			jwtPayload: { id: '' },
		}
		const mockResponse: Partial<Response> = { json: vi.fn() }
		const nextFunction = vi.fn()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction).toHaveBeenCalledExactlyOnceWith(expect.any(JwtMiddlewareException))
		expect(nextFunction.mock.calls[0][0]).toMatchObject({
			message: JwtMidExceptionMessages.MISSING_HEADER,
			statusCode: 401,
		})
		expect(mockRequest.jwtPayload?.id).toBe('')
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
		const mockResponse: Partial<Response> = { json: vi.fn() }
		const nextFunction = vi.fn()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction).toHaveBeenCalledExactlyOnceWith(expect.any(JwtMiddlewareException))
		expect(nextFunction.mock.calls[0][0]).toMatchObject({
			message: JwtMidExceptionMessages.INVALID_BEARER,
			statusCode: 401,
		})
		expect(mockRequest.jwtPayload?.id).toBe('')
	})

	it('should detect the missing JWT within authorization header and return error.', async () => {
		const mockRequest: Partial<JwtMiddlewareRequest> = {
			headers: { authorization: 'Bearer' },
			jwtPayload: { id: '' },
		}
		const mockResponse: Partial<Response> = { json: vi.fn() }
		const nextFunction = vi.fn()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction).toHaveBeenCalledExactlyOnceWith(expect.any(JwtMiddlewareException))
		expect(nextFunction.mock.calls[0][0]).toMatchObject({
			message: JwtMidExceptionMessages.INVALID_BEARER,
			statusCode: 401,
		})
		expect(mockRequest.jwtPayload?.id).toBe('')
	})

	it('should detect the invalid JWT within authorization header and return error.', async () => {
		const mockRequest: Partial<JwtMiddlewareRequest> = {
			headers: { authorization: 'Bearer randomJWTvalue' },
			jwtPayload: { id: '' },
		}
		const mockResponse: Partial<Response> = { json: vi.fn() }
		const nextFunction = vi.fn()

		const realJwtMiddleware = jwtMiddleware([
			{ secret: process.env.JWT_SECRET!, algorithm: 'RS256' },
		])
		realJwtMiddleware(
			mockRequest as JwtMiddlewareRequest,
			mockResponse as Response,
			nextFunction
		)

		expect(nextFunction).toHaveBeenCalledExactlyOnceWith(expect.any(JwtMiddlewareException))
		expect(nextFunction.mock.calls[0][0]).toMatchObject({
			message: JwtMidExceptionMessages.INVALID_JWT,
			statusCode: 401,
		})
		expect(mockRequest.jwtPayload?.id).toBe('')
	})
})
