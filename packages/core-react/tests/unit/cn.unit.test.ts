// node_modules
import { describe, expect, it } from 'vitest'

// testee
import { cn } from '../../src/lib/utils.js'

describe('cn', () => {
	it('should let a later class win a conflict on the same property', () => {
		expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
	})

	it('should drop falsy and conditional-off classes', () => {
		expect(cn('a', false, undefined, { b: true, c: false })).toBe('a b')
	})
})
