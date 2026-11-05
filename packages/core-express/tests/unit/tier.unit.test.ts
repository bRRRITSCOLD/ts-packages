import { describe, expect, it } from 'vitest'

// The shared Vitest config's unit project, as this package runs it
describe('unit tier', () => {
	it("should keep Vitest's 5 s default test timeout", ({ task }) => {
		expect(task.timeout).toBe(5_000)
	})
})
