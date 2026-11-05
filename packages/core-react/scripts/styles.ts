/**
 * Builds `dist/styles.css` from the token file with Style Dictionary: Tailwind and tw-animate-css
 * (the `animate-in` / `fade-in-0` / `zoom-in-95` utilities shadcn components open and close with),
 * the primitives and light semantics on `:root`, the dark semantics on `.dark`, and a
 * `@theme inline` block that turns each semantic into a Tailwind utility.
 */
import StyleDictionary from 'style-dictionary'
import type { DesignTokens, TransformedToken } from 'style-dictionary/types'

/** The token file: the top-level sets `primitive`, `light` and `dark`, each a DTCG token tree. */
export type TokenFile = Record<'primitive' | 'light' | 'dark', DesignTokens>

/** Font sizes are stored in px and emitted relative to the root font size. */
const ROOT_FONT_SIZE_PX = 16

/** shadcn's `rounded-*` scale, every step derived from the one `radius` semantic. */
const RADIUS_SCALE = [
	'--radius-sm: calc(var(--radius) - 4px);',
	'--radius-md: calc(var(--radius) - 2px);',
	'--radius-lg: var(--radius);',
	'--radius-xl: calc(var(--radius) + 4px);',
]

const pxToRem = {
	type: 'value' as const,
	filter: (token: TransformedToken) => token.$type === 'fontSizes',
	transform: (token: TransformedToken) => {
		const px = /^(-?\d*\.?\d+)px$/.exec(String(token.$value))
		if (!px)
			throw new Error(`${token.path.join('.')}: font size must be in px, got ${token.$value}`)
		return `${Number(px[1]) / ROOT_FONT_SIZE_PX}rem`
	},
}

/** Dotted names of every token in a set, such as `color.neutral.500` or `primary-foreground`. */
const tokenNames = (tree: DesignTokens, prefix: string[] = []): string[] =>
	Object.entries(tree).flatMap(([key, node]) => {
		if (key.startsWith('$')) return []
		const path = [...prefix, key]
		return node && typeof node === 'object' && '$value' in node
			? [path.join('.')]
			: tokenNames(node as DesignTokens, path)
	})

/** Runs Style Dictionary over the primitives plus one mode, returning `selector { … }` for `only`. */
const declarations = async (
	tokens: DesignTokens,
	selector: string,
	only: (name: string) => boolean
) => {
	const sd = new StyleDictionary({
		tokens,
		usesDtcg: true,
		log: { verbosity: 'verbose', warnings: 'disabled', errors: { brokenReferences: 'throw' } },
		hooks: { transforms: { 'core-react/px-to-rem': pxToRem } },
		platforms: {
			css: {
				transforms: ['name/kebab', 'shadow/css/shorthand', 'core-react/px-to-rem'],
				files: [
					{
						destination: 'styles.css',
						format: 'css/variables',
						filter: (token: TransformedToken) => only(token.path.join('.')),
						options: { selector, outputReferences: true, showFileHeader: false },
					},
				],
			},
		},
	})
	const [file] = await sd.formatPlatform('css')
	return String(file?.output).trim()
}

/** The Tailwind `@theme inline` block: a colour utility per colour semantic, and the radius scale. */
const theme = (semantics: DesignTokens) => {
	const lines = tokenNames(semantics).flatMap((name) => {
		const token = semantics[name] as { $type?: string }
		if (token.$type === 'color') return [`--color-${name}: var(--${name});`]
		if (name === 'radius') return RADIUS_SCALE
		return []
	})
	return ['@theme inline {', ...lines.map((line) => `  ${line}`), '}'].join('\n')
}

/** Builds the theme stylesheet `dist/styles.css` from the token file. */
export const buildStyles = async ({ primitive, light, dark }: TokenFile): Promise<string> => {
	const darkNames = new Set(tokenNames(dark))
	const root = await declarations({ ...primitive, ...light }, ':root', () => true)
	const darkBlock = await declarations({ ...primitive, ...dark }, '.dark', (name) =>
		darkNames.has(name)
	)
	return [
		'/* Generated from tokens/tokens.json by scripts/build-styles.ts. Do not edit. */',
		'@import "tailwindcss";',
		'@import "tw-animate-css";',
		'@source "./**/*.js";',
		'',
		'@custom-variant dark (&:is(.dark *));',
		'',
		root,
		'',
		darkBlock,
		'',
		theme(light),
		'',
		'@layer base {',
		'  * {',
		'    @apply border-border outline-ring/50;',
		'  }',
		'  body {',
		'    @apply bg-background text-foreground;',
		'  }',
		'}',
		'',
	].join('\n')
}
