import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// node_modules
import { __unstable__loadDesignSystem } from '@tailwindcss/node'
import { beforeAll, describe, expect, it } from 'vitest'

// testee
import { buildStyles, type TokenFile, tokenVars } from '../../scripts/styles.js'
// utils
import { BASE_UI_VARS, componentClasses, sourceFiles } from './__utils__/classes.js'
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

/**
 * Values a token property may take without a token: keywords, fractions of the parent, and a
 * 1px hairline (a separator's thickness, a nudge to align a control with its label's first line),
 * and `shadow-none`'s empty shadow.
 * An `!important` flag doesn't change the value it marks.
 */
const KEYWORD =
	/^(?:auto|0|1px|100%|fit-content|min-content|max-content|transparent|currentcolor|inherit|calc\(-?\d+ \/ \d+ \* 100%\)|0 0 #0000)$/

/** Tailwind's visually-hidden utility: its 1px box hides text for screen readers, it styles nothing. */
const VISUALLY_HIDDEN = 'sr-only'

const DECLARATION = /([\w-]+)\s*:\s*([^;{}]+);/g

/** The declarations in a class's CSS that set a token property without reading a token. */
const untokened = (css: string, vars: Set<string>): string[] =>
	[...css.matchAll(DECLARATION)]
		.filter(([, property = '']) => TOKEN_PROPERTY.test(property))
		.filter(([, , value = '']) => {
			const read = [...value.matchAll(/var\((--[\w-]+)/g)].map(([, name = '']) => name)
			const plain = value.replace(/\s*!important\s*$/, '').trim()
			return (
				!read.some((name) => vars.has(name) || BASE_UI_VARS.includes(name)) &&
				!KEYWORD.test(plain)
			)
		})
		.map(([declaration]) => declaration)

/** The classes these files apply, once each, without the `group` / `peer` markers. */
const classesIn = (files: string[]) =>
	[...new Set(files.flatMap(componentClasses))].filter((cls) => !MARKER.test(cls))

const isStory = (file: string) => file.endsWith('.stories.tsx')
const componentFiles = sourceFiles().filter((file) => file.startsWith('src/components/'))
const classes = classesIn(componentFiles.filter((file) => !isStory(file)))
const storyClasses = classesIn(componentFiles.filter(isStory))

/** A semantic token's colour in a mode, its references followed down to a `#rrggbb` primitive. */
const resolve = (mode: 'light' | 'dark', name: string): string => {
	const lookup = (path: string): unknown =>
		path
			.split('.')
			.reduce<unknown>(
				(node, key) => (node as Record<string, unknown> | undefined)?.[key],
				path.includes('.') ? tokens.primitive : tokens[mode]
			)
	let value = String((lookup(name) as { $value: unknown } | undefined)?.$value)
	for (let ref = /^\{(.+)\}$/.exec(value); ref; ref = /^\{(.+)\}$/.exec(value))
		value = String((lookup(ref[1] ?? '') as { $value: unknown } | undefined)?.$value)
	return value
}

const channels = (hex: string) =>
	[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]

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

	// Tailwind drops a class it can't resolve without a word, so a story's `w-96` (there is no
	// `space-96`) built fine and left its box unstyled in the published Storybook.
	it('should resolve every class the stories use to a utility of the built theme', () => {
		const css = theme.candidatesToCss(storyClasses)

		expect(storyClasses.length).toBeGreaterThan(0)
		expect(storyClasses.filter((_, i) => css[i] === null)).toEqual([])
	})

	it('should read a token for every token property a component class sets', () => {
		const styled = classes.filter((cls) => cls !== VISUALLY_HIDDEN)
		const offenders = theme
			.candidatesToCss(styled)
			.flatMap((css, i) => untokened(css ?? '', vars).map((d) => `${styled[i]}: ${d}`))

		expect(offenders).toEqual([])
	})

	it('should fill fields, outline controls, destructive tints and overlays from per-mode tokens, not a dark: alpha', () => {
		// `input-background`, `outline-background`, `destructive-background` and `overlay` hold
		// these alphas per mode, so the library can apply them; a `dark:` arm would split the rule again.
		const darkAlpha = /^dark:(?:[^:]+:)*bg-(?:input\/30|destructive\/20|background\/10)$/

		expect(classes.filter((cls) => darkAlpha.test(cls))).toEqual([])
	})

	describe('status colours', () => {
		const HUES = { success: 'green', warning: 'amber', info: 'blue' }
		const STATUSES = Object.keys(HUES) as (keyof typeof HUES)[]
		/**
		 * The colour each mode tints behind status text, and at what alpha. Light's text is a darker
		 * step than its tint (green.800 on green.600 at 10%), so the text reads at AA; dark tints its
		 * own colour at 20%, as `destructive-background` does.
		 */
		const TINT = {
			light: {
				source: (status: keyof typeof HUES) => `color.${HUES[status]}.600`,
				alpha: 0.1,
			},
			dark: { source: (status: keyof typeof HUES) => status, alpha: 0.2 },
		}

		/** An `rgba()` tint laid over an opaque `#rrggbb` colour, as `#rrggbb`. */
		const over = (tint: string, base: string) => {
			const [r = 0, g = 0, b = 0, a = 0] = (/rgba\(([^)]+)\)/.exec(tint)?.[1] ?? '')
				.split(',')
				.map(Number)
			return `#${channels(base)
				.map((c, i) => Math.round(a * ([r, g, b][i] ?? 0) + (1 - a) * c))
				.map((c) => c.toString(16).padStart(2, '0'))
				.join('')}`
		}

		/** WCAG 2 relative luminance of a `#rrggbb` colour. */
		const luminance = (hex: string) => {
			const [r, g, b] = channels(hex).map((c) => {
				const s = c / 255
				return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
			}) as [number, number, number]
			return 0.2126 * r + 0.7152 * g + 0.0722 * b
		}

		const contrast = (a: string, b: string) => {
			const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
			return (hi + 0.05) / (lo + 0.05)
		}

		it.each(['light', 'dark'] as const)(
			'should tint each status background with its %s tint colour and alpha',
			(mode) => {
				for (const status of STATUSES) {
					const [r, g, b] = channels(resolve(mode, TINT[mode].source(status)))
					expect(resolve(mode, `${status}-background`), status).toBe(
						`rgba(${r}, ${g}, ${b}, ${TINT[mode].alpha})`
					)
				}
			}
		)

		it.each(['light', 'dark'] as const)(
			'should make each status text read at 4.5:1 on its own %s tint, as a Badge shows it',
			(mode) => {
				for (const status of STATUSES) {
					const tint = over(
						resolve(mode, `${status}-background`),
						resolve(mode, 'background')
					)
					expect(contrast(resolve(mode, status), tint), status).toBeGreaterThanOrEqual(
						4.5
					)
				}
			}
		)

		it.each(['light', 'dark'] as const)(
			'should give each status a %s foreground that reads at 4.5:1 on its colour',
			(mode) => {
				for (const status of STATUSES) {
					const ratio = contrast(
						resolve(mode, `${status}-foreground`),
						resolve(mode, status)
					)
					expect(ratio, status).toBeGreaterThanOrEqual(4.5)
				}
			}
		)

		it('should make the status utilities', () => {
			const utilities = STATUSES.flatMap((status) => [
				`bg-${status}`,
				`text-${status}`,
				`text-${status}-foreground`,
				`bg-${status}-background`,
			])
			const css = theme.candidatesToCss(utilities)

			expect(utilities.filter((_, i) => css[i] === null)).toEqual([])
		})
	})

	it('should scrim overlays with foreground at 10% in light and background at 10% in dark', () => {
		const [lr, lg, lb] = channels(resolve('light', 'foreground'))
		const [dr, dg, db] = channels(resolve('dark', 'background'))

		expect(resolve('light', 'overlay')).toBe(`rgba(${lr}, ${lg}, ${lb}, 0.1)`)
		expect(resolve('dark', 'overlay')).toBe(`rgba(${dr}, ${dg}, ${db}, 0.1)`)
	})

	it('should leave out the Tailwind default scales a token type replaces', () => {
		const defaults = [
			'p-13',
			'h-11',
			'text-7xl',
			'font-black',
			'tracking-tighter',
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

		it('should accept a Base UI runtime variable and an important fraction', () => {
			expect(
				untokened(
					'.w-\\(--anchor-width\\) { width: var(--anchor-width); } .top-1\\/2\\! { top: calc(1 / 2 * 100%) !important; }',
					known
				)
			).toEqual([])
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
