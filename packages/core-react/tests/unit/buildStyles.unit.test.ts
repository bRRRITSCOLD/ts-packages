// node_modules
import { describe, expect, it } from 'vitest'

// testee
import { buildStyles } from '../../scripts/styles.js'
// fixtures
import { tokenFile } from '../fixtures/token-file.js'

/** The declarations inside the first `<selector> { … }` block of the CSS. */
const block = (css: string, selector: string) => {
	const start = css.indexOf(`${selector} {`)
	if (start === -1) throw new Error(`no ${selector} block in:\n${css}`)
	return css.slice(start, css.indexOf('\n}', start))
}

describe('buildStyles', () => {
	it('should import Tailwind and scan the built files beside it', async () => {
		const css = await buildStyles(tokenFile())

		expect(css).toContain('@import "tailwindcss";')
		expect(css).toContain('@source "./**/*.js";')
		expect(css).toContain('@custom-variant dark (&:is(.dark *));')
	})

	it('should import tw-animate-css, which shadcn components animate open and closed with', async () => {
		const css = await buildStyles(tokenFile())

		expect(css).toContain('@import "tw-animate-css";')
		expect(css.indexOf('@import "tw-animate-css";')).toBeGreaterThan(
			css.indexOf('@import "tailwindcss";')
		)
	})

	it('should put primitives and light semantics on :root, semantics referencing primitives', async () => {
		const root = block(await buildStyles(tokenFile()), ':root')

		expect(root).toContain('--color-white: #ffffff;')
		expect(root).toContain('--color-neutral-900: #171717;')
		expect(root).toContain('--background: var(--color-white);')
		expect(root).toContain('--primary-foreground: var(--color-neutral-100);')
	})

	it('should put only the dark semantics on .dark', async () => {
		const dark = block(await buildStyles(tokenFile()), '.dark')

		expect(dark).toContain('--background: var(--color-neutral-900);')
		expect(dark).toContain('--primary-foreground: var(--color-neutral-900);')
		expect(dark).not.toContain('--color-white')
	})

	it('should map each semantic colour to a Tailwind colour utility', async () => {
		const theme = block(await buildStyles(tokenFile()), '@theme inline')

		expect(theme).toContain('--color-background: var(--background);')
		expect(theme).toContain('--color-primary-foreground: var(--primary-foreground);')
	})

	it('should derive the rounded-* scale from the radius semantic', async () => {
		const theme = block(await buildStyles(tokenFile()), '@theme inline')

		expect(theme).toContain('--radius-sm: calc(var(--radius) - 4px);')
		expect(theme).toContain('--radius-md: calc(var(--radius) - 2px);')
		expect(theme).toContain('--radius-lg: var(--radius);')
		expect(theme).toContain('--radius-xl: calc(var(--radius) + 4px);')
	})

	it('should emit a font size stored in px as rem', async () => {
		const root = block(await buildStyles(tokenFile()), ':root')

		expect(root).toContain('--font-size-sm: 0.875rem;')
	})

	it('should fail on a reference to a token that does not exist', async () => {
		const tokens = tokenFile()
		tokens.dark.background = { $type: 'color', $value: '{color.neutral.950}' }

		await expect(buildStyles(tokens)).rejects.toThrow(/color\.neutral\.950/)
	})
})
