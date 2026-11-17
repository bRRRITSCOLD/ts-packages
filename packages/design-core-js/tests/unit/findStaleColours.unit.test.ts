import { describe, expect, it } from 'vitest'

// testee
import { findStaleColours } from '../../src/stale-colours.js'
// fixtures
import { darkFile, layer } from './__fixtures__/findStaleColours.unit.fixtures.js'

describe('findStaleColours', () => {
	it('should find nothing when every layer stores its token value in the active theme', () => {
		const report = findStaleColours(
			darkFile([
				layer({}),
				layer({
					layerId: 'b',
					token: 'background',
					colours: [{ hex: '#0A0A0A', opacity: 1 }],
				}),
				layer({
					layerId: 'c',
					attribute: 'stroke-color',
					token: 'color.neutral.800',
					colours: [{ hex: '#262626', opacity: 1 }],
				}),
			])
		)

		expect(report).toEqual({
			fileId: 'file-1',
			fileName: 'agentdeck',
			activeThemes: ['Mode/Dark'],
			fixTheme: { group: 'Mode', active: 'Dark', other: 'Light' },
			checked: 3,
			stale: [],
		})
	})

	it('should flag a layer storing the Light value of its token, with what it expected and found', () => {
		const stale = layer({ layerId: 'stale', colours: [{ hex: '#0a0a0a', opacity: 1 }] })

		expect(findStaleColours(darkFile([layer({}), stale])).stale).toEqual([
			{
				page: 'Sessions',
				board: 'Session list',
				layerId: 'stale',
				layerName: 'Title',
				copy: false,
				attribute: 'fill',
				token: 'foreground',
				expected: { hex: '#fafafa', opacity: 1 },
				found: { hex: '#0a0a0a', opacity: 1 },
			},
		])
	})

	it('should count library copies and page-local layers alike', () => {
		const stale = { colours: [{ hex: '#0a0a0a', opacity: 1 }] }
		const report = findStaleColours(
			darkFile([
				layer({ ...stale, layerId: 'local' }),
				layer({ ...stale, layerId: 'copy', copy: true }),
			])
		)

		expect(report.stale.map(({ layerId, copy }) => ({ layerId, copy }))).toEqual([
			{ layerId: 'local', copy: false },
			{ layerId: 'copy', copy: true },
		])
	})

	it('should compare through a chain of references', () => {
		const report = findStaleColours(
			darkFile([
				layer({ token: 'card-foreground', colours: [{ hex: '#0a0a0a', opacity: 1 }] }),
			])
		)

		expect(report.stale[0]?.expected).toEqual({ hex: '#fafafa', opacity: 1 })
	})

	describe('rgba tokens', () => {
		it('should pass a fill storing the colour and opacity of an rgba token', () => {
			const report = findStaleColours(
				darkFile([
					layer({
						token: 'info-background',
						colours: [{ hex: '#60a5fa', opacity: 0.2 }],
					}),
				])
			)

			expect(report).toMatchObject({ checked: 1, stale: [] })
		})

		it('should flag a fill whose opacity differs though its colour matches', () => {
			const report = findStaleColours(
				darkFile([
					layer({
						token: 'info-background',
						colours: [{ hex: '#60a5fa', opacity: 0.1 }],
					}),
				])
			)

			expect(report.stale[0]?.found).toEqual({ hex: '#60a5fa', opacity: 0.1 })
		})

		it('should allow for the rounding Penpot stores an opacity with', () => {
			const report = findStaleColours(
				darkFile([
					layer({
						token: 'info-background',
						colours: [{ hex: '#60a5fa', opacity: 0.2001 }],
					}),
				])
			)

			expect(report.stale).toEqual([])
		})
	})

	it('should flag a text layer when any of its stored fills differs, reporting the first that does', () => {
		const report = findStaleColours(
			darkFile([
				layer({
					colours: [
						{ hex: '#fafafa', opacity: 1 },
						{ hex: '#0a0a0a', opacity: 1 },
					],
				}),
			])
		)

		expect(report.stale[0]?.found).toEqual({ hex: '#0a0a0a', opacity: 1 })
	})

	it('should skip a token that is not a plain colour, is unknown, or a layer storing no colour', () => {
		const report = findStaleColours(
			darkFile([
				layer({ token: 'radius', colours: [{ hex: '#0a0a0a', opacity: 1 }] }),
				layer({ token: 'not-in-the-catalog' }),
				layer({ colours: [] }),
			])
		)

		expect(report).toMatchObject({ checked: 0, stale: [] })
	})

	describe('fixTheme', () => {
		it('should name the other theme of the active theme group', () => {
			const file = {
				...darkFile([]),
				activeThemes: ['Mode/Light'],
				activeSets: ['primitive', 'light'],
			}

			expect(findStaleColours(file).fixTheme).toEqual({
				group: 'Mode',
				active: 'Light',
				other: 'Dark',
			})
		})

		it('should be undefined when no theme is active', () => {
			expect(findStaleColours({ ...darkFile([]), activeThemes: [] }).fixTheme).toBeUndefined()
		})
	})
})
