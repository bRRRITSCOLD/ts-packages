// node_modules
import stringify from 'json-stringify-safe'

/**
 * Indicates who is to blame for creating the error (ether it belongs to the
 * server, or its the client's fault).
 */
export enum ExceptionFaults {
	CLIENT = 'CLIENT',
	SERVER = 'SERVER',
}

/**
 * Indicates the nature of the error: ether it was catch gracefully and accounted
 * for (internal) or was merely caught (unhandled).
 */
export enum ExceptionCodes {
	UNHANDLED = 1,
	INTERNAL = 2,
}

export const ExceptionMessage = 'Unhandled'

export const ExceptionName = 'Exception'

export type ExceptionConstructorInput = {
	message?: string
	code?: number
	fault?: ExceptionFaults
	cause?: Error | object
}

/**
 * Base Exception class. Aims to provide a unified baseline for error management across
 * packages.
 *
 * @property {string} name - Base error name. Set to 'Exception' by default to ease
 * Exception search during logging.
 * @property {ExceptionCodes} code - Indicates wether the error was accounted for and
 * thus managed gracefully, or if it was merely caught.
 * @property {ExceptionFaults} fault - Indicates wether the origin of the error due
 * an internal server malfunction or wether the client/user did something wrong
 * on their side.
 * @property {Error | object} cause - Stores additional information related to the error,
 * even an original error in case the current error is thrown to improve clarity. If
 * *cause* is an object, its expected to store additional errors within other *cause*
 * keys recursively.
 *
 * @example
 * ///////////////
 * ///// CJS /////
 * ///////////////
 * const { error } = require('@brrritscold/core-js')
 * const { Exception } = error
 *
 * // or
 * const { error: { Exception } } = require('@brrritscold/core-js')
 *
 * //or
 * const { Exception } = require('@brrritscold/core-js/error')
 *
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { error } from '@brrritscold/core-js'
 * const { Exception } = error
 *
 * // or
 * import { Exception } from '@brrritscold/core-js/error'
 *
 * // CODE
 * const ramException = new Exception({
 *   message: 'RAM download overflow, too much RAM.',
 *   code: ExceptionCodes.UNHANDLED,
 *   fault: ExceptionFaults.SERVER
 * })
 *
 * let secondException = new Exception({
 *   message: 'Time hacking failed.',
 *   cause: ramException
 * })
 *
 * // or
 * let secondException = new Exception({
 *   message: 'Time hacking failed.',
 *   cause: {
 *     info: 'Additional interesting information.',
 *     cause: ramException
 *   }
 * })
 */
export class Exception extends Error {
	isException = true
	code = ExceptionCodes.UNHANDLED

	fault = ExceptionFaults.SERVER

	/**
	 * Creates an instance of Exception.
	 *
	 * By default values are set to:
	 * - message: "Unhandled".
	 * - code: 1 (unhandled code).
	 * - fault: "SERVER"
	 * - cause: undefined
	 *
	 * @param params Object defining the message, code, fault and cause of the exception.
	 */
	constructor(params: ExceptionConstructorInput) {
		const { message, code, fault, cause } = params

		super(message ?? ExceptionMessage, { cause: cause })

		this.name = ExceptionName
		this.code = code ?? ExceptionCodes.UNHANDLED
		this.fault = fault ?? ExceptionFaults.SERVER
	}
}

/**
 * Extension of ExceptionConstructorInput to include the field 'statusCode',
 * which represents a HTTP Error status code.
 */
export type HttpExceptionConstructorInput = ExceptionConstructorInput & { statusCode?: number }

/**
 * Exception class for HTTP related failures and errors.
 * It extends Exception by adding a statusCode attribute that
 * represents the HTTP status code to return to the client.
 */
export class HttpException extends Exception {
	statusCode = 500

	/**
	 * Creates an instance of Exception.
	 *
	 * By default values are set to:
	 * - message: "Unhandled".
	 * - code: 1 (unhandled code).
	 * - fault: "SERVER"
	 * - statusCode: 500
	 * - cause: undefined
	 *
	 * @param params Object defining the message, code, fault. statusCode and cause of the exception.
	 */
	constructor(params: HttpExceptionConstructorInput) {
		super(params)
		this.statusCode = params.statusCode ?? 500
	}
}

/**
 * Creates the HttpException for a 400 the client caused, answered with `message`.
 *
 * @param message Message the client is answered with.
 * @param cause Original error, if any, kept for logging.
 *
 * @returns An HttpException with status 400, code INTERNAL and fault CLIENT.
 *
 * @example
 * import { badRequestException } from '@brrritscold/core-js/error'
 *
 * throw badRequestException('malformed cursor: lastId must be a string')
 */
export function badRequestException(message: string, cause?: Error | object): HttpException {
	return new HttpException({
		message,
		statusCode: 400,
		code: ExceptionCodes.INTERNAL,
		fault: ExceptionFaults.CLIENT,
		cause,
	})
}

// Source - https://stackoverflow.com/questions/30469261/checking-for-typeof-error-in-js
// Posted by Alexander Mills, modified by community. See post 'Timeline' for change history
// Retrieved 2025-12-01, License - CC BY-SA 4.0
// biome-ignore lint/suspicious/noExplicitAny: preserves original any-typed error handling signature
const isError = (e: any) => {
	return e && e.stack && e.message && typeof e.stack === 'string' && typeof e.message === 'string'
}

/**
 * Evaluates whether the input parameter is an object instance of the Exception class or not.
 * @param e Element being evaluated.
 * @returns boolean - Returns true if the element 'e' is an Exception, false otherwise.
 */
// biome-ignore lint/suspicious/noExplicitAny: preserves original any-typed error handling signature
export const isException = (e: any) => {
	return isError(e) && e.isException === true
}

/**
 * Evaluates whether the input parameter is an object instance of the HttpException class or not.
 * @param e Element being evaluated.
 * @returns boolean - Returns true if the element 'e' is an Exception, false otherwise.
 */
// biome-ignore lint/suspicious/noExplicitAny: preserves original any-typed error handling signature
export const isHttpException = (e: any) => {
	return isException(e) && e.statusCode !== undefined && e.statusCode !== null
}

/**
 * Wraps an unknown error with an instance of the Exception class if it does not belong
 * to it already.
 *
 * @param error Error in possible need of wrapping.
 *
 * @returns A representation of the error as an instance of the Exception class.
 */
export function mapErrorToException<E extends { message?: string }>(error: E) {
	if (isException(error)) {
		return error
	}

	return new Exception({
		message: error.message,
		cause: error,
	})
}

/**
 * Converts an Error into an Object, allowing it to be stringifyable.
 *
 * @param error Element of error type. During recursion may be of any type.
 *
 * @returns Object representing the original error's content.
 *
 * @example
 * ///////////////
 * ///// CJS /////
 * ///////////////
 * const { mapErrorToObject } = require('@brrritscold/core-js/error')
 *
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { mapErrorToObject } from '@brrritscold/core-js/error'
 *
 * // CODE
 * const error = new Error('Something went wrong!')
 * console.log(JSON.stringify(error))
 * // Output: '{}'
 * const newObject = mapErrorToObject(error)
 * console.log(JSON.stringify(newObject))
 * // Output: '{"stack":"Error: Something went ...","message":"Something went wrong!"}'
 */
// biome-ignore lint/suspicious/noExplicitAny: preserves original any-typed error handling signature
export const mapErrorToObject = (error: Error | any) => {
	const newError: Record<string, unknown> = {}

	if (error.cause) {
		// Duck typing anything that is error, otherwise its already stringifyable
		if (isError(error.cause)) {
			newError.cause = mapErrorToObject(error.cause)
		} else {
			newError.cause = error.cause
		}
	}

	const names = Object.getOwnPropertyNames(error).filter(
		(n) => n !== 'cause' && n !== 'isException'
	)

	for (const name of names) {
		// biome-ignore lint/suspicious/noExplicitAny: preserves original any-typed error handling signature
		newError[name] = (error as any)[name]
	}

	return JSON.parse(stringify(newError)) // Improvement: try to avoid stringify 'cause' if previously was an Error
}
