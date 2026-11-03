/**
 * Returns the current time as epoch milliseconds (`Date.now()` equivalent).
 *
 * ///////////////
 * ///// CJS /////
 * ///////////////
 * const { date } = require('@brrritscold/core-js')
 * const { getTime } = date
 *
 * // or
 * const { date: { getTime } } = require('@brrritscold/core-js')
 *
 * //or
 * const { getTime } = require('@brrritscold/core-js/date')
 *
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { date } from '@brrritscold/core-js'
 * const { getTime } = date
 *
 * // or
 * import { getTime } from '@brrritscold/core-js/date'
 *
 * @example
 * const time = getTime()
 */
export const getTime = (): number => {
	return new Date().getTime()
}
