// node_modules

// testee
import type { PageDesignColours, TokenColourLayer } from '../../../src/stale-colours.js'
import type { DesignTokenGroup } from '../../../src/token-file.js'

const color = (value: string) => ({ $type: 'color', $value: value }) as const

/** A token catalog shaped like tokens.json: primitives, and light and dark referencing them. */
export const TOKENS: Record<string, DesignTokenGroup> = {
	primitive: {
		color: {
			white: color('#ffffff'),
			neutral: { 50: color('#fafafa'), 800: color('#262626'), 950: color('#0a0a0a') },
		},
		'border-radius': { lg: { $type: 'borderRadius', $value: '10px' } },
	},
	light: {
		background: color('{color.white}'),
		foreground: color('{color.neutral.950}'),
		'card-foreground': color('{foreground}'),
		'info-background': color('rgba(37, 99, 235, 0.1)'),
	},
	dark: {
		background: color('{color.neutral.950}'),
		foreground: color('{color.neutral.50}'),
		'card-foreground': color('{foreground}'),
		'info-background': color('rgba(96, 165, 250, 0.2)'),
		radius: { $type: 'borderRadius', $value: '{border-radius.lg}' },
	},
}

/** A layer applying `token` to `attribute`, storing `colours`; a page-local layer unless `copy`. */
export const layer = (overrides: Partial<TokenColourLayer>): TokenColourLayer => ({
	page: 'Sessions',
	board: 'Session list',
	layerId: 'layer-1',
	layerName: 'Title',
	copy: false,
	attribute: 'fill',
	token: 'foreground',
	colours: [{ hex: '#fafafa', opacity: 1 }],
	...overrides,
})

/** A Dark page design file holding `layers`. */
export const darkFile = (layers: TokenColourLayer[]): PageDesignColours => ({
	fileId: 'file-1',
	fileName: 'agentdeck',
	activeThemes: ['Mode/Dark'],
	activeSets: ['primitive', 'dark'],
	tokenThemes: [
		{ group: 'Mode', name: 'Dark', sets: ['dark', 'primitive'] },
		{ group: 'Mode', name: 'Light', sets: ['light', 'primitive'] },
	],
	tokens: TOKENS,
	layers,
})
