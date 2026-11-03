import * as dotenvSafe from 'dotenv-safe'

/**
 * @example
 * ///////////////
 * ///// CJS /////
 * ///////////////
 * const { load } = require('@brrritscold/core-node/dotenv')
 *
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { load } from '@brrritscold/core-node/dotenv'
 *
 * // defaults to '.env.example' and '.env'
 * load()
 *
 * // custom example file and env file
 * load({
 *     example: '.env.custom.example',
 *     path: '.env.custom'
 * })
 */
export const load = (options?: dotenvSafe.DotenvSafeOptions) => {
	let data
	let error
	try {
		data = dotenvSafe.config(options)
	} catch (err) {
		error = err as dotenvSafe.MissingEnvVarsError
	}

	return { error, data }
}
