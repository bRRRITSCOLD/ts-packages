// node_modules
import type { StaleColour, StaleColourReport } from '@brrritscold/design-core-js/stale-colours'
import { describe, expect, it } from 'vitest'

// testee
import { formatStaleColourReport, staleColoursFix } from '../../src/stale-colours.js'

const report = (stale: StaleColour[]): StaleColourReport => ({
	fileId: 'file-1',
	fileName: 'agentdeck',
	activeThemes: ['Mode/Dark'],
	fixTheme: { group: 'Mode', active: 'Dark', other: 'Light' },
	checked: 120,
	stale,
})

const stale = (overrides: Partial<StaleColour>): StaleColour => ({
	page: 'Sessions',
	board: 'Session list',
	layerId: 'layer-1',
	layerName: 'Title',
	copy: true,
	attribute: 'fill',
	token: 'foreground',
	expected: { hex: '#fafafa', opacity: 1 },
	found: { hex: '#0a0a0a', opacity: 1 },
	...overrides,
})

describe('formatStaleColourReport', () => {
	it('should say the file is clean in one line', () => {
		expect(formatStaleColourReport(report([]))).toEqual([
			'agentdeck (file-1): active theme Mode/Dark; 120 token colours checked, 0 stale.',
		])
	})

	it('should group stale layers by token and colour, with examples, boards and the fix', () => {
		const lines = formatStaleColourReport(
			report([
				stale({ layerId: 'a' }),
				stale({ layerId: 'b', board: 'Header', layerName: 'Name', copy: false }),
				stale({
					layerId: 'c',
					attribute: 'stroke-color',
					token: 'border',
					expected: { hex: '#262626', opacity: 1 },
					found: { hex: '#e5e5e5', opacity: 1 },
				}),
				stale({ layerId: 'd' }),
				stale({ layerId: 'e' }),
			]),
			{ examples: 2 }
		)

		expect(lines).toEqual([
			'agentdeck (file-1): active theme Mode/Dark; 120 token colours checked, 5 stale.',
			'',
			'By token:',
			'  foreground: 4 layers store #0a0a0a, expected #fafafa',
			'    Sessions / Session list / Title (a): fill, component copy',
			'    Sessions / Header / Name (b): fill, page-local',
			'    … and 2 more',
			'  border: 1 layer stores #e5e5e5, expected #262626',
			'    Sessions / Session list / Title (c): stroke-color, component copy',
			'',
			'By board:',
			'  Sessions / Session list: 4',
			'  Sessions / Header: 1',
			'',
			staleColoursFix({ group: 'Mode', active: 'Dark', other: 'Light' }),
		])
	})

	it('should show an opacity other than 1', () => {
		const lines = formatStaleColourReport(
			report([
				stale({
					token: 'info-background',
					expected: { hex: '#60a5fa', opacity: 0.2 },
					found: { hex: '#2563eb', opacity: 0.1 },
				}),
			])
		)

		expect(lines).toContain(
			'  info-background: 1 layer stores #2563eb at 0.1 opacity, expected #60a5fa at 0.2 opacity'
		)
	})
})

describe('staleColoursFix', () => {
	it('should tell the user to toggle the Mode theme to Light and back to Dark', () => {
		expect(staleColoursFix({ group: 'Mode', active: 'Dark', other: 'Light' })).toBe(
			"Toggle the file's Mode theme to Light and back to Dark in Penpot (Tokens → Themes); then re-run."
		)
	})

	it('should tell the user to toggle the active theme when there is no other in its group', () => {
		expect(staleColoursFix(undefined)).toBe(
			"Toggle the file's active theme off and back on in Penpot (Tokens → Themes); then re-run."
		)
	})
})
