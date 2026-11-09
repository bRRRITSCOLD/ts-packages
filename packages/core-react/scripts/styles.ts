/**
 * Builds `dist/styles.css` from the token file with Style Dictionary: Tailwind and tw-animate-css
 * (the `animate-in` / `fade-in-0` / `zoom-in-95` utilities shadcn components open and close with),
 * the primitives and light semantics on `:root`, the dark semantics on `.dark`, and the Tailwind
 * theme: Tailwind's default scales cleared for every token type, and each token mapped to the
 * utilities that read it, so `p-4` is `padding: var(--space-4)`.
 */
import StyleDictionary from 'style-dictionary'
import type { DesignTokens, TransformedToken } from 'style-dictionary/types'

/** The token file: the top-level sets `primitive`, `light` and `dark`, each a DTCG token tree. */
export type TokenFile = Record<'primitive' | 'light' | 'dark', DesignTokens>

/** Font sizes are stored in px and emitted relative to the root font size. */
const ROOT_FONT_SIZE_PX = 16

/** shadcn's `rounded-*` scale, every step derived from the one `radius` semantic; `rounded-full` reads the `border-radius.full` primitive. */
const RADIUS_SCALE = [
	'--radius-sm: calc(var(--radius) - 4px);',
	'--radius-md: calc(var(--radius) - 2px);',
	'--radius-lg: var(--radius);',
	'--radius-xl: calc(var(--radius) + 4px);',
	'--radius-full: var(--border-radius-full);',
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

/**
 * Opacities are stored as a fraction (Penpot's form) and emitted as a percentage, the one form
 * both `opacity-50` and a colour modifier (`bg-muted/50`, a `color-mix()` percentage) accept.
 */
const fractionToPercent = {
	type: 'value' as const,
	filter: (token: TransformedToken) => token.$type === 'opacity',
	transform: (token: TransformedToken) => `${Number(token.$value) * 100}%`,
}

/** A token in a set: its dotted name, such as `color.neutral.500` or `primary-foreground`, and type. */
type Token = { name: string; type: string | undefined }

/** Every token in a set, in file order. */
const tokensIn = (tree: DesignTokens, prefix: string[] = []): Token[] =>
	Object.entries(tree).flatMap(([key, node]) => {
		if (key.startsWith('$')) return []
		const path = [...prefix, key]
		return node && typeof node === 'object' && '$value' in node
			? [{ name: path.join('.'), type: (node as { $type?: string }).$type }]
			: tokensIn(node as DesignTokens, path)
	})

/** A token's CSS variable, as Style Dictionary names it: `space.1-5` is `--space-1-5`. */
const cssVar = (name: string) => `--${name.replaceAll('.', '-')}`

/** The CSS variable of every token in the file, `--space-4` or `--primary-foreground`. */
export const tokenVars = ({ primitive, light, dark }: TokenFile): string[] => [
	...new Set(
		[primitive, light, dark].flatMap((set) => tokensIn(set).map(({ name }) => cssVar(name)))
	),
]

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
		hooks: {
			transforms: {
				'core-react/px-to-rem': pxToRem,
				'core-react/fraction-to-percent': fractionToPercent,
			},
		},
		platforms: {
			css: {
				transforms: [
					'name/kebab',
					'shadow/css/shorthand',
					'core-react/px-to-rem',
					'core-react/fraction-to-percent',
				],
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

/**
 * The Tailwind theme namespace each primitive token type fills: `space.4` is `--spacing-4`
 * (`p-4`), `font-size.sm` is `--text-sm` (`text-sm`). Colours and radius come from semantics.
 */
const THEME_NAMESPACE: Partial<Record<string, string>> = {
	spacing: 'spacing',
	sizing: 'container',
	fontFamilies: 'font',
	fontSizes: 'text',
	fontWeights: 'font-weight',
	number: 'leading',
	letterSpacing: 'tracking',
	shadow: 'shadow',
	opacity: 'opacity',
}

/**
 * Tailwind's default scales for every namespace a token type fills, cleared so that only tokens
 * make utilities there. Breakpoints, motion and z-index keep Tailwind's defaults.
 */
const DEFAULT_SCALES = [
	'--color-*',
	'--spacing-*',
	'--container-*',
	'--font-*',
	'--font-weight-*',
	'--text-*',
	'--leading-*',
	'--tracking-*',
	'--shadow-*',
	'--radius-*',
].map((namespace) => `${namespace}: initial;`)

/** A theme variable reading a token: `--spacing-1\.5: var(--space-1-5);` makes `p-1.5`. */
const themeVar = (namespace: string, group: string, name: string) => {
	const step = name.slice(group.length + 1).replaceAll('.', '-')
	// A half step is written with a dash in a token name and with a dot in a class.
	const key = step.replace(/^(\d+)-(\d+)$/, '$1\\.$2')
	return { name: `--${namespace}-${key}`, value: `var(${cssVar(name)})` }
}

const block = (at: string, lines: string[]) =>
	[`${at} {`, ...lines.map((line) => `  ${line}`), '}'].join('\n')

/**
 * The Tailwind theme: every default scale a token type replaces is cleared, then each primitive
 * scale, each colour semantic and the radius scale is mapped to the utilities that read it. A
 * token already named as its theme variable (`--font-weight-medium`, `--shadow-xs`) is declared
 * `reference`, so Tailwind doesn't also emit it as `--font-weight-medium: var(--font-weight-medium)`.
 */
const theme = (primitive: DesignTokens, semantics: DesignTokens) => {
	const inline: string[] = [...DEFAULT_SCALES]
	const reference: string[] = []
	for (const { name, type } of tokensIn(primitive)) {
		const namespace = type && THEME_NAMESPACE[type]
		if (!namespace) continue
		const { name: variable, value } = themeVar(namespace, name.split('.')[0] ?? '', name)
		;(variable === cssVar(name) ? reference : inline).push(`${variable}: ${value};`)
	}
	for (const { name, type } of tokensIn(semantics)) {
		if (type === 'color') inline.push(`--color-${name}: var(--${name});`)
		if (name === 'radius') inline.push(...RADIUS_SCALE)
	}
	return [block('@theme inline', inline), block('@theme inline reference', reference)].join(
		'\n\n'
	)
}

/** Builds the theme stylesheet `dist/styles.css` from the token file. */
export const buildStyles = async ({ primitive, light, dark }: TokenFile): Promise<string> => {
	const darkNames = new Set(tokensIn(dark).map(({ name }) => name))
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
		theme(primitive, light),
		'',
		'@layer base {',
		'  * {',
		'    @apply border-border outline-ring/50;',
		'  }',
		'  body {',
		'    @apply bg-background text-foreground leading-normal;',
		'  }',
		'}',
		'',
	].join('\n')
}
