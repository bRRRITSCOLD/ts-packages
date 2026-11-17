import { describe, expect, it } from 'vitest'

// testee
import { resolveColourTokens } from '../../src/stale-colours.js'
// fixtures
import { TOKENS } from './__fixtures__/findStaleColours.unit.fixtures.js'

describe('resolveColourTokens', () => {
	it('should resolve each colour token of the active sets, following references', () => {
		const colours = resolveColourTokens(TOKENS, ['primitive', 'dark'])

		expect(colours.foreground).toEqual({ hex: '#fafafa', opacity: 1 })
		expect(colours['color.neutral.950']).toEqual({ hex: '#0a0a0a', opacity: 1 })
	})

	it('should follow a chain of references through both sets', () => {
		// card-foreground → {foreground} → {color.neutral.50}
		expect(resolveColourTokens(TOKENS, ['primitive', 'dark'])['card-foreground']).toEqual({
			hex: '#fafafa',
			opacity: 1,
		})
	})

	it('should let a later active set win over an earlier one', () => {
		expect(resolveColourTokens(TOKENS, ['primitive', 'light']).foreground).toEqual({
			hex: '#0a0a0a',
			opacity: 1,
		})
	})

	it('should leave out sets that are not active', () => {
		expect(resolveColourTokens(TOKENS, ['primitive']).foreground).toBeUndefined()
	})

	it('should leave out a token that is not a plain colour, or whose reference does not resolve', () => {
		const colours = resolveColourTokens(
			{
				...TOKENS,
				dark: {
					...TOKENS.dark,
					dangling: { $type: 'color', $value: '{color.nowhere}' },
					loop: { $type: 'color', $value: '{loop}' },
				},
			},
			['primitive', 'dark']
		)

		expect(colours.radius).toBeUndefined()
		expect(colours.dangling).toBeUndefined()
		expect(colours.loop).toBeUndefined()
	})
})
