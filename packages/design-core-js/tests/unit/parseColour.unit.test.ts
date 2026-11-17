import { describe, expect, it } from 'vitest'

// testee
import { parseColour } from '../../src/stale-colours.js'

describe('parseColour', () => {
	it('should read a six-digit hex in lower case at full opacity', () => {
		expect(parseColour('#0A0A0A')).toEqual({ hex: '#0a0a0a', opacity: 1 })
	})

	it('should expand a three-digit hex', () => {
		expect(parseColour('#fA0')).toEqual({ hex: '#ffaa00', opacity: 1 })
	})

	it('should read the alpha of an eight-digit hex as the opacity', () => {
		const colour = parseColour('#0000001a')

		expect(colour?.hex).toBe('#000000')
		expect(colour?.opacity).toBeCloseTo(0.1, 2)
	})

	it('should read rgba() as a hex and its alpha as the opacity', () => {
		expect(parseColour('rgba(251, 191, 36, 0.2)')).toEqual({ hex: '#fbbf24', opacity: 0.2 })
	})

	it('should read rgb() at full opacity, with or without spaces', () => {
		expect(parseColour('rgb(38,38,38)')).toEqual({ hex: '#262626', opacity: 1 })
	})

	it('should read transparent as black at no opacity', () => {
		expect(parseColour('transparent')).toEqual({ hex: '#000000', opacity: 0 })
	})

	it('should not read a value that is not a plain colour', () => {
		for (const value of ['{color.white}', '16px', 'darken(#fff, 10%)', 'rgb(300, 0, 0)', 42])
			expect(parseColour(value)).toBeUndefined()
	})
})
