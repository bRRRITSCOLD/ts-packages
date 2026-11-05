// node_modules
import { describe, expect, it } from 'vitest'

// src
import * as common from '../../src/common.js'

describe('e2e', () => {
	it('should expose deepCopy from the common entry', () => {
		expect(common.deepCopy({ a: 1 })).toEqual({ a: 1 })
	})
})
