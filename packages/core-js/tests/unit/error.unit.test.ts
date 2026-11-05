import { describe, expect, it } from 'vitest'

// application/testee
import {
	badRequestException,
	Exception,
	ExceptionCodes,
	ExceptionFaults,
	ExceptionMessage,
	ExceptionName,
	HttpException,
	isHttpException,
	mapErrorToException,
	mapErrorToObject,
} from '../../src/error.js'

describe('error.ts', () => {
	describe('Exception:', () => {
		it('should create an Exception with default values', async () => {
			const e = new Exception({})

			expect(e).toBeDefined()
			expect(e.name).toBe(ExceptionName)
			expect(e.message).toBe(ExceptionMessage)
			expect(e.code).toBe(ExceptionCodes.UNHANDLED)
			expect(e.fault).toBe(ExceptionFaults.SERVER)
			expect(e.cause).toBeUndefined()
		})

		it('should create an Exception with specific values (no cause)', async () => {
			const testMessage = 'unit test'
			const e = new Exception({
				message: testMessage,
				code: 6,
				fault: ExceptionFaults.CLIENT,
			})

			expect(e).toBeDefined()
			expect(e.name).toBe(ExceptionName)
			expect(e.message).toBe(testMessage)
			expect(e.code).toBe(6)
			expect(e.fault).toBe(ExceptionFaults.CLIENT)
			expect(e.cause).toBeUndefined()
		})

		it('should create an Exception with specific values (with cause)', async () => {
			const testMessage = 'cause'
			const cause = new Exception({
				message: testMessage,
				code: 6,
				fault: ExceptionFaults.CLIENT,
			})

			const e = new Exception({ cause })

			expect(e).toBeDefined()
			expect(e.name).toBe(ExceptionName)
			expect(e.message).toBe(ExceptionMessage)
			expect(e.code).toBe(ExceptionCodes.UNHANDLED)
			expect(e.fault).toBe(ExceptionFaults.SERVER)
			expect(e.cause).toBeDefined()
			// biome-ignore lint/suspicious/noExplicitAny: test asserts on dynamically-shaped cause object
			expect((e.cause as any)['name']).toBe(ExceptionName)
			// biome-ignore lint/suspicious/noExplicitAny: test asserts on dynamically-shaped cause object
			expect((e.cause as any)['message']).toBe(testMessage)
			// biome-ignore lint/suspicious/noExplicitAny: test asserts on dynamically-shaped cause object
			expect((e.cause as any)['code']).toBe(6)
			// biome-ignore lint/suspicious/noExplicitAny: test asserts on dynamically-shaped cause object
			expect((e.cause as any)['fault']).toBe(ExceptionFaults.CLIENT)
			// biome-ignore lint/suspicious/noExplicitAny: test asserts on dynamically-shaped cause object
			expect((e.cause as any)['cause']).toBeUndefined()
		})
	})

	describe('mapErrorToObject:', () => {
		it('should create an object based of a simple error', async () => {
			const error = new Error('Something went wrong!')

			expect(JSON.stringify(error)).toBe('{}')

			const result = mapErrorToObject(error)

			expect(result).toBeDefined()
			expect(result.message).toBe(error.message)
			expect(result.stack.length).toBeGreaterThan(0)
			expect(JSON.stringify(result)).not.toBe('{}')
		})

		it('should create an object based of an Exception error', async () => {
			const exception = new Exception({})
			const strException = JSON.stringify(exception)

			expect(strException.includes('name')).toBe(true)
			expect(strException.includes('code')).toBe(true)
			expect(strException.includes('fault')).toBe(true)
			expect(strException.includes('message')).toBe(false)
			expect(strException.includes('stack')).toBe(false)

			const result = mapErrorToObject(exception)
			const strResult = JSON.stringify(result)

			expect(result).toBeDefined()
			expect(result.message).toBe(exception.message)
			expect(result.stack.length).toBeGreaterThan(0)
			expect(strResult.includes('name')).toBe(true)
			expect(strResult.includes('code')).toBe(true)
			expect(strResult.includes('fault')).toBe(true)
			expect(strResult.includes('message')).toBe(true)
			expect(strResult.includes('stack')).toBe(true)
		})

		it('should create an object based of an Exception with another Exception as cause', async () => {
			const testMessage = 'cause'
			const cause = new Exception({
				message: testMessage,
				code: 6,
				fault: ExceptionFaults.CLIENT,
			})
			const exception = new Exception({ cause })

			const result = mapErrorToObject(exception)
			const strCause = JSON.stringify(result.cause)
			expect(result.cause).toBeDefined()
			expect(result.cause.message).toBe(testMessage)
			expect(result.cause.stack.length).toBeGreaterThan(0)
			expect(strCause.includes('name')).toBe(true)
			expect(strCause.includes('code')).toBe(true)
			expect(strCause.includes('fault')).toBe(true)
			expect(strCause.includes('message')).toBe(true)
			expect(strCause.includes('stack')).toBe(true)
			const strResult = JSON.stringify(result)

			expect(result).toBeDefined()
			expect(result.message).toBe(exception.message)
			expect(result.stack.length).toBeGreaterThan(0)
			expect(strResult.length).toBeGreaterThan(strCause.length)
		})

		it('should create an object based of an Exception with another Object as cause', async () => {
			const cause = { line: 777, file: 'causeFile.ts' }
			const exception = new Exception({ cause })

			const result = mapErrorToObject(exception)
			const strResult = JSON.stringify(result)

			expect(result.cause).toBeDefined()
			expect(result.cause.line).toBe(cause.line)
			expect(result.cause.file).toBe(cause.file)
			expect(strResult.includes('name')).toBe(true)
			expect(strResult.includes('code')).toBe(true)
			expect(strResult.includes('fault')).toBe(true)
			expect(strResult.includes('message')).toBe(true)
			expect(strResult.includes('stack')).toBe(true)
			expect(strResult.includes('cause')).toBe(true)
			expect(strResult.includes('line')).toBe(true)
			expect(strResult.includes('file')).toBe(true)
		})

		it('should create an object based of an Error with just a String as cause', async () => {
			const cause = 'Large explanation on why did something broke.'
			const exception = new Error('Something went wrong', { cause })

			const result = mapErrorToObject(exception)
			const strResult = JSON.stringify(result)

			expect(result.cause).toBeDefined()
			expect(result.cause).toBe(cause)
			expect(strResult.includes('message')).toBe(true)
			expect(strResult.includes('stack')).toBe(true)
			expect(strResult.includes('cause')).toBe(true)
		})
	})

	describe('mapErrorToException:', () => {
		it('should return the same Exception passed as parameter', async () => {
			const error = new Exception({ message: 'Something went wrong!' })

			const result = mapErrorToException(error)

			expect(result).toBeDefined()
			expect(result.message).toBe(error.message)
			expect(result.cause).toBeUndefined()
		})

		it('should return an Exception given an error-like object passed as parameter', async () => {
			const error = new Error('Something went wrong!')

			const result = mapErrorToException(error)

			expect(result).toBeDefined()
			expect(result.message).toBe(error.message)
			expect(result.cause).toBeDefined()
			expect((result.cause as { message: string }).message).toBeDefined()
			expect((result.cause as { message: string }).message).toBe(error.message)
		})
	})

	describe('isHttpException:', () => {
		it('should return true for HttpException passed as parameter', async () => {
			const error = new HttpException({ message: 'Something went wrong!' })

			expect(isHttpException(error)).toBe(true)
		})

		it('should return false for Exception passed as parameter', async () => {
			const error = new Exception({ message: 'Something went wrong!' })

			expect(isHttpException(error)).toBe(false)
		})
	})

	describe('badRequestException:', () => {
		it('should create a client-fault 400 HttpException with its message and cause', async () => {
			const cause = new Error('original')
			const error = badRequestException('malformed cursor: lastId must be a string', cause)

			expect(error).toBeInstanceOf(HttpException)
			expect(error.statusCode).toBe(400)
			expect(error.code).toBe(ExceptionCodes.INTERNAL)
			expect(error.fault).toBe(ExceptionFaults.CLIENT)
			expect(error.message).toBe('malformed cursor: lastId must be a string')
			expect(error.cause).toBe(cause)
		})
	})
})
