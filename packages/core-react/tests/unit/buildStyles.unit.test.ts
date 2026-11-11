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

	it('should load Inter at the four weights the tokens use, before any rule', async () => {
		const css = await buildStyles(tokenFile())

		for (const weight of [400, 500, 600, 700])
			expect(css).toContain(`@import "@fontsource/inter/${weight}.css";`)
		expect(css.indexOf('@import "@fontsource/inter/700.css";')).toBeLessThan(
			css.indexOf('@custom-variant')
		)
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

	it('should clear the Tailwind default scales a token type replaces', async () => {
		const theme = block(await buildStyles(tokenFile()), '@theme inline')

		expect(theme).toContain('--spacing-*: initial;')
		expect(theme).toContain('--text-*: initial;')
		expect(theme).toContain('--color-*: initial;')
		expect(theme.indexOf('--spacing-*: initial;')).toBeLessThan(
			theme.indexOf('--spacing-4: var(--space-4);')
		)
	})

	it('should map each primitive scale to the utilities that read it, a half step with a dot', async () => {
		const theme = block(await buildStyles(tokenFile()), '@theme inline')

		expect(theme).toContain('--spacing-4: var(--space-4);')
		expect(theme).toContain('--spacing-1\\.5: var(--space-1-5);')
		expect(theme).toContain('--text-sm: var(--font-size-sm);')
	})

	it('should declare a token already named as its theme variable for reference only', async () => {
		const css = await buildStyles(tokenFile())

		expect(block(css, '@theme inline reference')).toContain(
			'--font-weight-medium: var(--font-weight-medium);'
		)
		expect(block(css, '@theme inline')).not.toContain('--font-weight-medium: var(')
	})

	it('should map the rounded-* scale to the radius-* semantics, with no calc()', async () => {
		const css = await buildStyles(tokenFile())

		expect(block(css, ':root')).toContain('--radius-md: var(--border-radius-md);')
		expect(block(css, '@theme inline reference')).toContain('--radius-md: var(--radius-md);')
		expect(block(css, '@theme inline')).toContain('--radius-full: var(--border-radius-full);')
		expect(css).not.toContain('calc(var(--radius)')
	})

	it('should emit a font size stored in px as rem', async () => {
		const root = block(await buildStyles(tokenFile()), ':root')

		expect(root).toContain('--font-size-sm: 0.875rem;')
	})

	it('should emit an opacity stored as a fraction as a percentage, which a colour modifier can read', async () => {
		const root = block(await buildStyles(tokenFile()), ':root')

		expect(root).toContain('--opacity-50: 50%;')
	})

	it('should fail on a reference to a token that does not exist', async () => {
		const tokens = tokenFile()
		tokens.dark.background = { $type: 'color', $value: '{color.neutral.950}' }

		await expect(buildStyles(tokens)).rejects.toThrow(/color\.neutral\.950/)
	})
})
