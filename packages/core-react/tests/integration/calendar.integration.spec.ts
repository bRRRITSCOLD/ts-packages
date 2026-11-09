// node_modules
import { expect, type Page, test } from '@playwright/test'

// testee
import { calendar } from '../../src/testing.js'
// utils
import { openStory } from './__utils__/story.js'

const days = (page: Page) => calendar(page.locator('[data-slot=calendar]'))

// Every story shows November 2026; Default's play function leaves the 12th picked.
test.describe('calendar(root)', () => {
	test('should read the month on show and the picked day', async ({ page }) => {
		await openStory(page, 'components-calendar--default')
		const due = calendar(page.getByTestId('calendar'))

		expect(await due.months()).toEqual(['November 2026'])
		expect(await due.selected()).toEqual(['2026-11-12'])
	})

	test('should step to another month and pick a day there', async ({ page }) => {
		await openStory(page, 'components-calendar--default')
		const due = days(page)

		await due.select('2027-01-15')

		expect(await due.months()).toEqual(['January 2027'])
		expect(await due.selected()).toEqual(['2027-01-15'])
		await expect(due.day('2027-01-15')).toHaveAccessibleName(
			'Friday, January 15, 2027, selected'
		)
	})

	test('should leave a picked day picked, where a click would clear it', async ({ page }) => {
		await openStory(page, 'components-calendar--default')
		const due = days(page)

		await due.select('2026-11-12')

		expect(await due.selected()).toEqual(['2026-11-12'])
	})

	test('should step a month at a time', async ({ page }) => {
		await openStory(page, 'components-calendar--default')
		const due = days(page)

		await due.next()
		expect(await due.months()).toEqual(['December 2026'])
		await due.previous()
		await due.previous()
		expect(await due.months()).toEqual(['October 2026'])
	})

	test('should find a day in its own month, not as an outside day of another', async ({
		page,
	}) => {
		await openStory(page, 'components-calendar--two-months')
		const due = days(page)

		await expect(due.day('2026-12-01')).toHaveCount(1)
		await due.select('2026-12-01')

		expect(await due.months()).toEqual(['November 2026', 'December 2026'])
		expect(await due.selected()).toEqual(['2026-12-01'])
	})

	test('should refuse to pick a disabled day instead of waiting on it', async ({ page }) => {
		await openStory(page, 'components-calendar--disabled-days')

		await expect(days(page).select('2026-11-14')).rejects.toThrow(/disabled/)
		await expect(days(page).day('2026-11-14')).toBeDisabled()
	})

	test('should refuse to step past startMonth instead of waiting on it', async ({ page }) => {
		await openStory(page, 'components-calendar--dropdowns')
		const due = days(page)

		await due.show('2020-01-15')

		expect(await due.months()).toEqual(['January 2020'])
		await expect(due.previous()).rejects.toThrow(/no previous month/)
	})

	test('should move focus with the arrow keys and pick with Enter', async ({ page }) => {
		await openStory(page, 'components-calendar--default')
		const due = days(page)

		await due.day('2026-11-12').focus()
		await page.keyboard.press('ArrowUp')
		await expect(due.day('2026-11-05')).toBeFocused()
		await page.keyboard.press('Enter')

		expect(await due.selected()).toEqual(['2026-11-05'])
	})
})
