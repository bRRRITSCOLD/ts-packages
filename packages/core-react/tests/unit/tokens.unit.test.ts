import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// node_modules
import { __unstable__loadDesignSystem } from '@tailwindcss/node'
import { beforeAll, describe, expect, it } from 'vitest'

// testee
import { buildStyles, type TokenFile, tokenVars } from '../../scripts/styles.js'
// utils
import { componentClasses, sourceFiles } from './__utils__/classes.js'
import { PACKAGE_DIR } from './__utils__/package.js'

const tokens = JSON.parse(
	readFileSync(join(PACKAGE_DIR, 'tokens/tokens.json'), 'utf8')
) as TokenFile

/** Classes that mark an element for `group-*` / `peer-*` variants and emit no CSS themselves. */
const MARKER = /^(group|peer)(\/[\w-]+)?$/

/**
 * The CSS properties a token type sets: spacing and sizing, font family, size and weight,
 * letter spacing, shadow, opacity, radius and colour. Breakpoints, motion and z-index stay
 * Tailwind defaults, and line height and stroke width aren't checked.
 */
const TOKEN_PROPERTY =
	/^(?:padding|margin|inset|gap|row-gap|column-gap|top|right|bottom|left|(?:min-|max-)?(?:width|height)|font-size|font-family|font-weight|letter-spacing|--tw-shadow|opacity|border(?:-[a-z]+)*-radius|color|background-color|border(?:-[a-z]+)?-color|outline-color|--tw-ring-color|fill|stroke|text-decoration-color)(?:-[a-z]+)*$/

/** Values a token property may take without a token: keywords and fractions of the parent. */
const KEYWORD = /^(?:auto|0|100%|transparent|currentcolor|inherit|calc\(-?\d+ \/ \d+ \* 100%\))$/

/** Tailwind's visually-hidden utility: its 1px box hides text for screen readers, it styles nothing. */
const VISUALLY_HIDDEN = 'sr-only'

const DECLARATION = /([\w-]+)\s*:\s*([^;{}]+);/g

/** The declarations in a class's CSS that set a token property without reading a token. */
const untokened = (css: string, vars: Set<string>): string[] =>
	[...css.matchAll(DECLARATION)]
		.filter(([, property = '']) => TOKEN_PROPERTY.test(property))
		.filter(([, , value = '']) => {
			const read = [...value.matchAll(/var\((--[\w-]+)/g)].map(([, name]) => name)
			return !read.some((name) => vars.has(name ?? '')) && !KEYWORD.test(value.trim())
		})
		.map(([declaration]) => declaration)

const components = sourceFiles().filter(
	(file) => file.startsWith('src/components/') && !file.endsWith('.stories.tsx')
)
const classes = [...new Set(components.flatMap(componentClasses))].filter(
	(cls) => !MARKER.test(cls)
)

describe('tokens', () => {
	let theme: Awaited<ReturnType<typeof __unstable__loadDesignSystem>>
	const vars = new Set(tokenVars(tokens))

	beforeAll(async () => {
		theme = await __unstable__loadDesignSystem(await buildStyles(tokens), { base: PACKAGE_DIR })
	})

	it('should define every semantic token in both light and dark', () => {
		expect(Object.keys(tokens.dark).sort()).toEqual(Object.keys(tokens.light).sort())
	})

	it('should resolve every class the components use to a utility of the built theme', () => {
		const css = theme.candidatesToCss(classes)

		expect(classes.length).toBeGreaterThan(0)
		expect(classes.filter((_, i) => css[i] === null)).toEqual([])
	})

	it('should read a token for every token property a component class sets', () => {
		const styled = classes.filter((cls) => cls !== VISUALLY_HIDDEN)
		const offenders = theme
			.candidatesToCss(styled)
			.flatMap((css, i) => untokened(css ?? '', vars).map((d) => `${styled[i]}: ${d}`))

		expect(offenders).toEqual([])
	})

	it('should leave out the Tailwind default scales a token type replaces', () => {
		const defaults = [
			'p-13',
			'h-11',
			'text-7xl',
			'font-black',
			'tracking-widest',
			'shadow-2xl',
			'rounded-3xl',
			'max-w-7xl',
			'bg-slate-500',
			'text-white',
		]
		const css = theme.candidatesToCss(defaults)

		expect(defaults.filter((_, i) => css[i] !== null)).toEqual([])
	})

	describe('untokened', () => {
		const known = new Set(['--space-4', '--primary', '--radius'])

		it('should flag a token property set from a raw value or a Tailwind default', () => {
			expect(
				untokened(
					'.p-3 { padding: calc(var(--spacing) * 3); } .opacity-40 { opacity: 40%; } .shadow-xs { --tw-shadow: 0 1px 2px 0 var(--tw-shadow-color, rgb(0 0 0 / 0.05)); }',
					known
				)
			).toEqual([
				'padding: calc(var(--spacing) * 3);',
				'opacity: 40%;',
				'--tw-shadow: 0 1px 2px 0 var(--tw-shadow-color, rgb(0 0 0 / 0.05));',
			])
		})

		it('should accept a token read, a keyword and a fraction, and ignore other properties', () => {
			expect(
				untokened(
					'.p-4 { padding: var(--space-4); } .bg-primary\\/80:hover { background-color: color-mix(in oklab, var(--primary) 80%, transparent); } .rounded-md { border-radius: calc(var(--radius) - 2px); } .w-full { width: 100%; } .top-1\\/2 { top: calc(1 / 2 * 100%); } .z-50 { z-index: 50; } .ring-1 { --tw-ring-shadow: 0 0 0 calc(1px + var(--tw-ring-offset-width)); }',
					known
				)
			).toEqual([])
		})
	})
})
