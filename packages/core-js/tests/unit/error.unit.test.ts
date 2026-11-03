import { expect } from 'chai'

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
	before(async () => {})

	after(async () => {})

	beforeEach(async () => {})

	afterEach(async () => {})

	describe('Exception:', () => {
		it('should create an Exception with default values', async () => {
			const e = new Exception({})

			expect(e).to.be.not.undefined
			expect(e.name).to.be.eq(ExceptionName)
			expect(e.message).to.be.eq(ExceptionMessage)
			expect(e.code).to.be.eq(ExceptionCodes.UNHANDLED)
			expect(e.fault).to.be.eq(ExceptionFaults.SERVER)
			expect(e.cause).to.be.undefined
		})

		it('should create an Exception with specific values (no cause)', async () => {
			const testMessage = 'unit test'
			const e = new Exception({
				message: testMessage,
				code: 6,
				fault: ExceptionFaults.CLIENT,
			})

			expect(e).to.be.not.undefined
			expect(e.name).to.be.eq(ExceptionName)
			expect(e.message).to.be.eq(testMessage)
			expect(e.code).to.be.eq(6)
			expect(e.fault).to.be.eq(ExceptionFaults.CLIENT)
			expect(e.cause).to.be.undefined
		})

		it('should create an Exception with specific values (with cause)', async () => {
			const testMessage = 'cause'
			const cause = new Exception({
				message: testMessage,
				code: 6,
				fault: ExceptionFaults.CLIENT,
			})

			const e = new Exception({ cause })

			expect(e).to.be.not.undefined
			expect(e.name).to.be.eq(ExceptionName)
			expect(e.message).to.be.eq(ExceptionMessage)
			expect(e.code).to.be.eq(ExceptionCodes.UNHANDLED)
			expect(e.fault).to.be.eq(ExceptionFaults.SERVER)
			expect(e.cause).to.be.not.undefined
			// biome-ignore lint/suspicious/noExplicitAny: test asserts on dynamically-shaped cause object
			expect((e.cause as any)['name']).to.be.eq(ExceptionName)
			// biome-ignore lint/suspicious/noExplicitAny: test asserts on dynamically-shaped cause object
			expect((e.cause as any)['message']).to.be.eq(testMessage)
			// biome-ignore lint/suspicious/noExplicitAny: test asserts on dynamically-shaped cause object
			expect((e.cause as any)['code']).to.be.eq(6)
			// biome-ignore lint/suspicious/noExplicitAny: test asserts on dynamically-shaped cause object
			expect((e.cause as any)['fault']).to.be.eq(ExceptionFaults.CLIENT)
			// biome-ignore lint/suspicious/noExplicitAny: test asserts on dynamically-shaped cause object
			expect((e.cause as any)['cause']).to.be.undefined
		})
	})

	describe('mapErrorToObject:', () => {
		it('should create an object based of a simple error', async () => {
			const error = new Error('Something went wrong!')

			expect(JSON.stringify(error)).to.be.eq('{}')

			const result = mapErrorToObject(error)

			expect(result).to.be.not.undefined
			expect(result.message).to.be.eq(error.message)
			expect(result.stack.length).to.be.greaterThan(0)
			expect(JSON.stringify(result)).to.be.not.eq('{}')
		})

		it('should create an object based of an Exception error', async () => {
			const exception = new Exception({})
			const strException = JSON.stringify(exception)

			expect(strException.includes('name')).to.be.true
			expect(strException.includes('code')).to.be.true
			expect(strException.includes('fault')).to.be.true
			expect(strException.includes('message')).to.be.false
			expect(strException.includes('stack')).to.be.false

			const result = mapErrorToObject(exception)
			const strResult = JSON.stringify(result)

			expect(result).to.be.not.undefined
			expect(result.message).to.be.eq(exception.message)
			expect(result.stack.length).to.be.greaterThan(0)
			expect(strResult.includes('name')).to.be.true
			expect(strResult.includes('code')).to.be.true
			expect(strResult.includes('fault')).to.be.true
			expect(strResult.includes('message')).to.be.true
			expect(strResult.includes('stack')).to.be.true
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
			expect(result.cause).to.be.not.undefined
			expect(result.cause.message).to.be.eq(testMessage)
			expect(result.cause.stack.length).to.be.greaterThan(0)
			expect(strCause.includes('name')).to.be.true
			expect(strCause.includes('code')).to.be.true
			expect(strCause.includes('fault')).to.be.true
			expect(strCause.includes('message')).to.be.true
			expect(strCause.includes('stack')).to.be.true
			const strResult = JSON.stringify(result)

			expect(result).to.be.not.undefined
			expect(result.message).to.be.eq(exception.message)
			expect(result.stack.length).to.be.greaterThan(0)
			expect(strResult.length).to.be.greaterThan(strCause.length)
		})

		it('should create an object based of an Exception with another Object as cause', async () => {
			const cause = { line: 777, file: 'causeFile.ts' }
			const exception = new Exception({ cause })

			const result = mapErrorToObject(exception)
			const strResult = JSON.stringify(result)

			expect(result.cause).to.be.not.undefined
			expect(result.cause.line).to.be.eq(cause.line)
			expect(result.cause.file).to.be.eq(cause.file)
			expect(strResult.includes('name')).to.be.true
			expect(strResult.includes('code')).to.be.true
			expect(strResult.includes('fault')).to.be.true
			expect(strResult.includes('message')).to.be.true
			expect(strResult.includes('stack')).to.be.true
			expect(strResult.includes('cause')).to.be.true
			expect(strResult.includes('line')).to.be.true
			expect(strResult.includes('file')).to.be.true
		})

		it('should create an object based of an Error with just a String as cause', async () => {
			const cause = 'Large explanation on why did something broke.'
			const exception = new Error('Something went wrong', { cause })

			const result = mapErrorToObject(exception)
			const strResult = JSON.stringify(result)

			expect(result.cause).to.be.not.undefined
			expect(result.cause).to.be.eq(cause)
			expect(strResult.includes('message')).to.be.true
			expect(strResult.includes('stack')).to.be.true
			expect(strResult.includes('cause')).to.be.true
		})
	})

	describe('mapErrorToException:', () => {
		it('should return the same Exception passed as parameter', async () => {
			const error = new Exception({ message: 'Something went wrong!' })

			const result = mapErrorToException(error)

			expect(result).to.be.not.undefined
			expect(result.message).to.be.eq(error.message)
			expect(result.cause).to.be.undefined
		})

		it('should return an Exception given an error-like object passed as parameter', async () => {
			const error = new Error('Something went wrong!')

			const result = mapErrorToException(error)

			expect(result).to.be.not.undefined
			expect(result.message).to.be.eq(error.message)
			expect(result.cause).to.be.not.undefined
			expect((result.cause as { message: string }).message).to.be.not.undefined
			expect((result.cause as { message: string }).message).to.be.eq(error.message)
		})
	})

	describe('isHttpException:', () => {
		it('should return true for HttpException passed as parameter', async () => {
			const error = new HttpException({ message: 'Something went wrong!' })

			expect(isHttpException(error)).to.be.true
		})

		it('should return false for Exception passed as parameter', async () => {
			const error = new Exception({ message: 'Something went wrong!' })

			expect(isHttpException(error)).to.be.false
		})
	})

	describe('badRequestException:', () => {
		it('should create a client-fault 400 HttpException with its message and cause', async () => {
			const cause = new Error('original')
			const error = badRequestException('malformed cursor: lastId must be a string', cause)

			expect(error).to.be.instanceOf(HttpException)
			expect(error.statusCode).to.eq(400)
			expect(error.code).to.eq(ExceptionCodes.INTERNAL)
			expect(error.fault).to.eq(ExceptionFaults.CLIENT)
			expect(error.message).to.eq('malformed cursor: lastId must be a string')
			expect(error.cause).to.eq(cause)
		})
	})
})
