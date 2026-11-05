import { describe, expect, it } from 'vitest'

// application/testee
import { omitNil } from '../../src/obj.js'

describe('obj.ts', () => {
	it('should remove properties that have values of undefined or null fron an object', async () => {
		const returned = omitNil({
			zero: 0,
			one: 'world',
			two: undefined,
			three: null,
			four: NaN,
			five: false,
		})

		expect(returned).toBeDefined()
		expect(returned).toHaveProperty('zero', 0)
		expect(returned).toHaveProperty('one', 'world')
		expect(returned).not.toHaveProperty('two')
		expect(returned).not.toHaveProperty('three')
		expect(returned).toHaveProperty('four', NaN)
		expect(returned).toHaveProperty('five', false)
	})
})
