/**
 * Returns the current time as epoch milliseconds (`Date.now()` equivalent).
 *
 * // ESM
 * import { getTime } from '@brrritscold/core-js/date'
 *
 * // CJS
 * const { getTime } = require('@brrritscold/core-js/date')
 *
 * @example
 * const time = getTime()
 */
export const getTime = (): number => {
	return new Date().getTime()
}
