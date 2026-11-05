import { describe, expect, it } from 'vitest'

// The shared Vitest config's integration project, as this package runs it
describe('integration tier', () => {
	it('should load .env.integration.test before the tests run', () => {
		expect(process.env.SUPER_SECRET).toBe('NUN_YA!')
	})

	it('should give each test 120 s', ({ task }) => {
		expect(task.timeout).toBe(120_000)
	})
})
