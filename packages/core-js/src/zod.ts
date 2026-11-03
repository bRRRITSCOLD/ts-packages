// node_modules
import { z } from 'zod/v4'

import { ExceptionCodes, ExceptionFaults, HttpException } from './error.js'

/**
 * Validates a value against a given schema and throws a std http 400 error if invalid
 *
 * @example
 * ///////////////
 * ///// CJS /////
 * ///////////////
 * const { z, validateSchemaAsync } = require('@brrritscold/core-js/zod')
 *
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { z, validateSchemaAsync } from '@brrritscold/core-js/zod'
 *
 * const value = { firstName: 'Fred', age: 100 }
 * const schema = z.object({ firstName: z.string(), age: z.number() })
 *
 * const validObj = await validateSchemaAsync<z.infer<typeof schema>>({ value, schema })
 * // { firstName: 'Fred', age: 100 }
 *
 * const validObj = await validateSchemaAsync<z.infer<typeof schema>>({ value: { firstName: 100, age: 'Fred' }, schema })
 * // throws { name: HttpException, statuscODE: 400, code: 2, cause: 'client', cause: { issues: [...] } }
 */
export const validateSchemaAsync = async <V>({
	value,
	schema,
}: {
	value: unknown
	schema: z.ZodType<V>
}) => {
	const validation = await schema.safeParseAsync(value)

	if (validation.error) {
		throw new HttpException({
			message: 'Schema validation error.',
			statusCode: 400,
			code: ExceptionCodes.INTERNAL,
			fault: ExceptionFaults.CLIENT,
			cause: validation.error,
		})
	}

	return validation.data
}

export * from 'zod/v4'
