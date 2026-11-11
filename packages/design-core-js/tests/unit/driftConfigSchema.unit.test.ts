import { describe, expect, it } from 'vitest'

// testee
import { driftConfigSchema } from '../../src/drift-check.js'

describe('driftConfigSchema', () => {
	it('should accept a config without `pending`', () => {
		expect(driftConfigSchema.safeParse({ allowlist: ['cn'] }).success).toBe(true)
	})

	it('should accept `pending` components, variant properties and values', () => {
		const config = {
			allowlist: [],
			pending: { Card: '*', Button: { orientation: '*', variant: ['brand'] } },
		}

		expect(driftConfigSchema.parse(config)).toEqual(config)
	})

	it.each([
		['a component that is neither `*` nor a record', { Card: 'all' }],
		['a variant property that is neither `*` nor a list', { Button: { variant: 'brand' } }],
		['an empty list of values', { Button: { variant: [] } }],
	])('should reject %s', (_, pending) => {
		expect(driftConfigSchema.safeParse({ allowlist: [], pending }).success).toBe(false)
	})
})
