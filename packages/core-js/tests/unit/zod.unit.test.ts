import { expect } from 'chai'
import { ExceptionCodes, ExceptionFaults, HttpException } from '../../src/error.js'
// application/testee
import { validateSchemaAsync, ZodError, z } from '../../src/zod.js'

describe('obj.ts', () => {
	before(async () => {})

	after(async () => {})

	beforeEach(async () => {})

	afterEach(async () => {})

	it('should asynchronously validate data against a schema', async () => {
		const schema = z.object({ firstName: z.string(), age: z.number() })

		let value: Record<string, unknown> = { firstName: 'Fred', age: 100 }

		let result
		let error
		try {
			result = await validateSchemaAsync({ value, schema })
		} catch (err) {
			error = err
		}

		expect(error).to.be.undefined
		expect(result).to.be.not.undefined
		expect(result?.firstName).to.eq(value.firstName)
		expect(result?.age).to.eq(value.age)

		value = { firstName: 100, age: 'Fred' }

		result = undefined
		error = undefined
		try {
			result = await validateSchemaAsync({ value, schema })
		} catch (err) {
			error = err
		}

		expect(result).to.be.undefined
		expect(error).to.be.not.undefined
		expect((error as HttpException)?.statusCode).to.eq(400)
		expect((error as HttpException)?.code).to.eq(ExceptionCodes.INTERNAL)
		expect((error as HttpException)?.fault).to.eq(ExceptionFaults.CLIENT)
		expect(
			((error as HttpException)?.cause as ZodError).issues
		).to.have.length.greaterThanOrEqual(2)
	})
})
