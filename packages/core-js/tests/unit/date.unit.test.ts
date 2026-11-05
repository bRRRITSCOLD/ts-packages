import { describe, expect, it } from 'vitest'

// application/testee
import { getTime } from '../../src/date.js'

describe('date.ts', () => {
	it('should get the current epoch time', async () => {
		const time = getTime()

		expect(time).toBeDefined()
		expect(time).toBeTypeOf('number')
		expect(time).toBeLessThanOrEqual(new Date().getTime())
		expect(time).toBeGreaterThan(new Date('01/01/2025').getTime())
	})
})
