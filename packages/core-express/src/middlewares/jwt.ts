// node_modules

import { Exception, isHttpException } from '@brrritscold/core-js/error'
import type { JWTConstructor } from '@brrritscold/core-node/jwt'
import type { NextFunction, Request, Response } from 'express'
import { JwtMiddlewareException, JwtMidExceptionMessages } from '../error.js'
// configs
import { verifyJwt } from '../utils/jwt.js'

/**
 * Express Request interface with additional fields to store JWT related data.
 */
export interface JwtMiddlewareRequest extends Request {
	jwtPayload: { id: string }
}

/**
 * Verifies the JWT stored in the headers of request match with the expected ones from our
 * system. Once checked, it stores the value of the JWT *id* within the Express Request.
 * Its important that the Request implements the JwtMiddlewareRequest interface.
 *
 * @param secretConfigs JWT configurations of the system, necessary for verification.
 *
 * @returns An already configured JWT middleware.
 */
export const jwtMiddleware = (secretConfigs: JWTConstructor[]) => {
	return (req: JwtMiddlewareRequest, res: Response, next: NextFunction) => {
		try {
			if (!req.headers || !req.headers.authorization) {
				throw new JwtMiddlewareException({
					message: JwtMidExceptionMessages.MISSING_HEADER,
					statusCode: 401,
				})
			}

			const authorization = req.headers.authorization

			const authContents = authorization.split(' ')

			if (authContents.length !== 2 || authContents[0].toLowerCase() !== 'bearer') {
				throw new JwtMiddlewareException({
					message: JwtMidExceptionMessages.INVALID_BEARER,
					statusCode: 401,
				})
			}

			const verification = verifyJwt(authContents[1], secretConfigs)

			if (!verification.success) {
				throw new JwtMiddlewareException({
					message: JwtMidExceptionMessages.INVALID_JWT,
				})
			}

			req.jwtPayload = { id: verification.id }

			next()
		} catch (err) {
			if (!isHttpException(err)) {
				res.statusCode = 500
				next(new Exception({ cause: err as Error }))
			}

			next(err)
		}
	}
}
