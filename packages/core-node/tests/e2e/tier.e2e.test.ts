import { describe, expect, it } from 'vitest'

// The shared Vitest config's e2e project, as this package runs it
describe('e2e tier', () => {
	it('should give each test 120 s', ({ task }) => {
		expect(task.timeout).toBe(120_000)
	})
})
