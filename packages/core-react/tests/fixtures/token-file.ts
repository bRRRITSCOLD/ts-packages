import type { TokenFile } from '../../scripts/styles.js'

/** A small token file in the shape of `tokens/tokens.json`: a fresh tree on every call. */
export const tokenFile = (): TokenFile => ({
	primitive: {
		color: {
			white: { $type: 'color', $value: '#ffffff' },
			neutral: {
				'100': { $type: 'color', $value: '#f5f5f5' },
				'900': { $type: 'color', $value: '#171717' },
			},
		},
		'border-radius': { lg: { $type: 'borderRadius', $value: '10px' } },
		'font-size': { sm: { $type: 'fontSizes', $value: '14px' } },
	},
	light: {
		background: { $type: 'color', $value: '{color.white}' },
		'primary-foreground': { $type: 'color', $value: '{color.neutral.100}' },
		radius: { $type: 'borderRadius', $value: '{border-radius.lg}' },
	},
	dark: {
		background: { $type: 'color', $value: '{color.neutral.900}' },
		'primary-foreground': { $type: 'color', $value: '{color.neutral.900}' },
		radius: { $type: 'borderRadius', $value: '{border-radius.lg}' },
	},
})
