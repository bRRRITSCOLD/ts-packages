import isNil from 'lodash/isNil.js'
import omitBy from 'lodash/omitBy.js'

/**
 * @example
 * ///////////////
 * ///// CJS /////
 * ///////////////
 * const { obj } = require('@brrritscold/core-js')
 * const { omitNil } = obj
 *
 * // or
 * const { obj: { omitNil } } = require('@brrritscold/core-js')
 *
 * //or
 * const { omitNil } = require('@brrritscold/core-js/obj')
 *
 * ///////////////
 * ///// ESM /////
 * ///////////////
 * import { obj } from '@brrritscold/core-js'
 * const { omitNil } = obj
 *
 * // or
 * import { omitNil } from '@brrritscold/core-js/obj'
 *
 * const item = omitNil({ zero: 0, one: 'world', two: undefined, three: null, four: NaN, five: false })
 *
 * constole.log(item)
 * // { zero: 0, one: 'world', four: NaN, five: false }
 */
export const omitNil = <T extends object>(item: T) => omitBy<T>(item, isNil)
