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
		space: {
			'4': { $type: 'spacing', $value: '16px' },
			'1-5': { $type: 'spacing', $value: '6px' },
		},
		'border-radius': {
			md: { $type: 'borderRadius', $value: '8px' },
			lg: { $type: 'borderRadius', $value: '10px' },
			full: { $type: 'borderRadius', $value: '9999px' },
		},
		'font-size': { sm: { $type: 'fontSizes', $value: '14px' } },
		'font-weight': { medium: { $type: 'fontWeights', $value: 500 } },
		opacity: { '50': { $type: 'opacity', $value: 0.5 } },
	},
	light: {
		background: { $type: 'color', $value: '{color.white}' },
		'primary-foreground': { $type: 'color', $value: '{color.neutral.100}' },
		radius: { $type: 'borderRadius', $value: '{border-radius.lg}' },
		'radius-md': { $type: 'borderRadius', $value: '{border-radius.md}' },
	},
	dark: {
		background: { $type: 'color', $value: '{color.neutral.900}' },
		'primary-foreground': { $type: 'color', $value: '{color.neutral.900}' },
		radius: { $type: 'borderRadius', $value: '{border-radius.lg}' },
		'radius-md': { $type: 'borderRadius', $value: '{border-radius.md}' },
	},
})
