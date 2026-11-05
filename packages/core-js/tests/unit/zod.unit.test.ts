import { describe, expect, it } from 'vitest'
import { ExceptionCodes, ExceptionFaults, HttpException } from '../../src/error.js'
// application/testee
import { validateSchemaAsync, ZodError, z } from '../../src/zod.js'

describe('obj.ts', () => {
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

		expect(error).toBeUndefined()
		expect(result).toBeDefined()
		expect(result?.firstName).toBe(value.firstName)
		expect(result?.age).toBe(value.age)

		value = { firstName: 100, age: 'Fred' }

		result = undefined
		error = undefined
		try {
			result = await validateSchemaAsync({ value, schema })
		} catch (err) {
			error = err
		}

		expect(result).toBeUndefined()
		expect(error).toBeDefined()
		expect((error as HttpException)?.statusCode).toBe(400)
		expect((error as HttpException)?.code).toBe(ExceptionCodes.INTERNAL)
		expect((error as HttpException)?.fault).toBe(ExceptionFaults.CLIENT)
		expect(((error as HttpException)?.cause as ZodError).issues.length).toBeGreaterThanOrEqual(
			2
		)
	})
})
