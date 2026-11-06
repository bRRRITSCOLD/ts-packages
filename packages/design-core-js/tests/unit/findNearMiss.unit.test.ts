import { describe, expect, it } from 'vitest'

// testee
import { findNearMiss } from '../../src/component-link.js'

describe('findNearMiss', () => {
	const exports = ['AlertDialog', 'Button', 'CardHeader']

	it('should find the one candidate spelled the same ignoring case and whitespace', () => {
		expect(findNearMiss('Alert Dialog', exports)).toBe('AlertDialog')
		expect(findNearMiss('alertdialog', exports)).toBe('AlertDialog')
		expect(findNearMiss('Cardheader', exports)).toBe('CardHeader')
	})

	it('should find nothing when no candidate matches loosely', () => {
		expect(findNearMiss('Badge', exports)).toBeUndefined()
	})

	it('should find nothing when several candidates match loosely', () => {
		expect(findNearMiss('alert dialog', ['AlertDialog', 'Alertdialog'])).toBeUndefined()
	})

	it('should never suggest the name itself', () => {
		expect(findNearMiss('Button', exports)).toBeUndefined()
	})
})
