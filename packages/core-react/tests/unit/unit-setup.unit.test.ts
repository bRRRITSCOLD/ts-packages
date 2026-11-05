// node_modules
import { describe, expect, it } from 'vitest'

describe('unit setup', () => {
	it('should make fetch throw, since a test that needs network belongs in the integration tier', () => {
		expect(() => fetch('https://example.invalid/')).toThrow(
			'network in unit tier: write an integration spec'
		)
	})
})
