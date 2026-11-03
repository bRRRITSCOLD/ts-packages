import { ExceptionCodes, ExceptionFaults, HttpException } from '@brrritscold/core-js/error'

export type JwtMidExceptionConstructorInput = {
	message: JwtMidExceptionMessages
	statusCode?: number
	cause?: Error | object
}

export enum JwtMidExceptionMessages {
	MISSING_HEADER = 'Missing "authorization" header.',
	INVALID_BEARER = 'Missing "bearer" auth or "bearer" is missing the JWT.',
	INVALID_JWT = 'Company JWT value not valid.',
}

/**
 * Exception class for JWT Middleware related failures and errors.
 */
export class JwtMiddlewareException extends HttpException {
	code = ExceptionCodes.INTERNAL
	fault = ExceptionFaults.CLIENT

	/**
	 * Creates an instance of JwtMiddlewareException.
	 * By default values are set to:
	 * - message: JwtMidExceptionMessages.UNKNOWN
	 * - code: 2 (internal code).
	 * - fault: "CLIENT"
	 * - statusCode: 401
	 *
	 * @param params Object defining the message and cause of the exception.
	 */
	constructor(params: JwtMidExceptionConstructorInput) {
		super(params)
		if (!params.statusCode) {
			this.statusCode = 401
		}
	}
}
