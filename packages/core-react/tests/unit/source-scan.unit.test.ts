// node_modules
import { describe, expect, it } from 'vitest'

// utils
import { forbiddenClasses, sourceFiles, stringsIn } from './__utils__/classes.js'

/**
 * The component objects in `src/testing.ts` hold Playwright selectors (`td[data-day="…"]`), never
 * classes, and a selector's attribute brackets read as an arbitrary value.
 */
const SELECTORS = 'src/testing.ts'

describe('source scan', () => {
	it('should find no arbitrary value or default-palette utility in src/ outside the component objects', () => {
		const offenders = sourceFiles()
			.filter((file) => file !== SELECTORS)
			.flatMap((file) => forbiddenClasses(stringsIn(file)).map((cls) => `${file}: ${cls}`))

		expect(offenders).toEqual([])
	})

	describe('forbiddenClasses', () => {
		it('should reject arbitrary values, behind any variant', () => {
			expect(
				forbiddenClasses([
					'bg-[#fff] p-[13px]',
					'hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]',
					'rounded-[min(var(--radius-md),8px)] bg-(--brand) [mask-type:luminance]',
					'bg-primary/[0.4]',
				])
			).toEqual([
				'bg-[#fff]',
				'p-[13px]',
				'hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]',
				'rounded-[min(var(--radius-md),8px)]',
				'bg-(--brand)',
				'[mask-type:luminance]',
				'bg-primary/[0.4]',
			])
		})

		it('should reject default-palette utilities, with or without an opacity', () => {
			expect(
				forbiddenClasses([
					'bg-slate-500 text-white',
					'dark:ring-offset-zinc-950/50 bg-black/50',
				])
			).toEqual(['bg-slate-500', 'text-white', 'dark:ring-offset-zinc-950/50', 'bg-black/50'])
		})

		it('should reject arithmetic on Base UI variables that reads a raw value or another variable', () => {
			expect(
				forbiddenClasses([
					'min-w-[calc(var(--anchor-width)+28px)]',
					'max-h-[calc(var(--available-height)-var(--radius))]',
					'min-w-[calc(var(--spacing-7)+var(--spacing-1))]',
				])
			).toEqual([
				'min-w-[calc(var(--anchor-width)+28px)]',
				'max-h-[calc(var(--available-height)-var(--radius))]',
				'min-w-[calc(var(--spacing-7)+var(--spacing-1))]',
			])
		})

		it('should reject a transform on Base UI variables that adds a length or reads another variable', () => {
			expect(
				forbiddenClasses([
					'transform-[translateY(calc(var(--toast-swipe-movement-y)+16px))]',
					'transform-[translateY(calc(var(--toast-index)*var(--gap)))]',
					'transform-[translateY(150%)]',
					'[transform:translateY(var(--toast-offset-y))]',
				])
			).toEqual([
				'transform-[translateY(calc(var(--toast-swipe-movement-y)+16px))]',
				'transform-[translateY(calc(var(--toast-index)*var(--gap)))]',
				'transform-[translateY(150%)]',
				'[transform:translateY(var(--toast-offset-y))]',
			])
		})

		it('should reject a component variable declared from a raw value, and an unlisted variable', () => {
			expect(
				forbiddenClasses([
					'[--sidebar-width:16rem]',
					'[--sidebar-width:calc(var(--spacing-64)+1px)]',
					'[--brand-width:var(--spacing-64)] w-(--brand-width)',
				])
			).toEqual([
				'[--sidebar-width:16rem]',
				'[--sidebar-width:calc(var(--spacing-64)+1px)]',
				'[--brand-width:var(--spacing-64)]',
				'w-(--brand-width)',
			])
		})

		it('should accept a component variable read by a utility and declared from a spacing token', () => {
			expect(
				forbiddenClasses(['w-(--sidebar-width) [--sidebar-width:var(--spacing-64)]'])
			).toEqual([])
		})

		it('should accept token utilities and arbitrary variants', () => {
			expect(
				forbiddenClasses([
					'bg-primary hover:bg-primary/80 text-primary-foreground rounded-md h-9 px-2.5',
					"[&_svg:not([class*='size-'])]:size-4 has-data-[icon=inline-end]:pr-2",
					'active:not-aria-[haspopup]:translate-y-px in-data-[slot=button-group]:rounded-md',
					'@base-ui/react/button use client',
					'origin-(--transform-origin) max-h-(--available-height) w-(--anchor-width)',
					'min-w-[calc(var(--anchor-width)+var(--spacing-7))]',
					'max-h-[min(calc(var(--spacing-72)-var(--spacing-9)),calc(var(--available-height)-var(--spacing-9)))]',
					'h-(--toast-frontmost-height) z-[calc(1000-var(--toast-index))]',
					'transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-var(--toast-index)*var(--spacing-3)-min(1,var(--toast-index)*0.1)*var(--toast-frontmost-height)))_scale(max(0,1-var(--toast-index)*0.1))]',
					'data-ending-style:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))]',
				])
			).toEqual([])
		})
	})
})
