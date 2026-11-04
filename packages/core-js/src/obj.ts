import isNil from 'lodash/isNil.js'
import omitBy from 'lodash/omitBy.js'

/**
 * Returns a shallow copy of an object without its `null` and `undefined` properties, keeping other falsy values.
 *
 * @example
 * // ESM
 * import { omitNil } from '@brrritscold/core-js/obj'
 *
 * // CJS
 * const { omitNil } = require('@brrritscold/core-js/obj')
 *
 * const item = omitNil({ zero: 0, one: 'world', two: undefined, three: null, four: NaN, five: false })
 *
 * constole.log(item)
 * // { zero: 0, one: 'world', four: NaN, five: false }
 */
export const omitNil = <T extends object>(item: T) => omitBy<T>(item, isNil)
