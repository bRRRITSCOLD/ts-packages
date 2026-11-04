import cloneDeep from 'lodash/cloneDeep.js'

/**
 * Recursively copy a value so that mutating the copy never affects the source.
 *
 * Useful in tests for deriving a fixture variant from a shared fixture without
 * leaking the mutation into other test cases.
 *
 * @example
 * // ESM
 * import { deepCopy } from '@brrritscold/testing-core-js/common'
 *
 * // CJS
 * const { deepCopy } = require('@brrritscold/testing-core-js/common')
 *
 * const fixture = { id: 1, nested: { status: 'pending' } }
 * const variant = deepCopy(fixture)
 *
 * variant.nested.status = 'complete'
 *
 * console.log(fixture.nested.status)
 * // 'pending'
 */
export const deepCopy = <T>(item: T): T => cloneDeep(item)
