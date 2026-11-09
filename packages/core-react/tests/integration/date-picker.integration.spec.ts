// node_modules
import { expect, type Page, test } from '@playwright/test'

// testee
import { datePicker } from '../../src/testing.js'
// utils
import { openStory } from './__utils__/story.js'

const due = (page: Page) => datePicker(page.getByTestId('due'))

// Default's play function leaves November 20th, 2026 picked and the popup closed.
test.describe('datePicker(trigger)', () => {
	test('should read the picked date off the trigger', async ({ page }) => {
		await openStory(page, 'components-datepicker--default')

		expect(await due(page).value()).toBe('November 20th, 2026')
	})

	test('should find the trigger by its field label', async ({ page }) => {
		await openStory(page, 'components-datepicker--default')
		const picker = datePicker(page.getByRole('button', { name: 'Due date' }))

		expect(await picker.value()).toBe('November 20th, 2026')
	})

	test('should pick a date in another month, close and return focus', async ({ page }) => {
		await openStory(page, 'components-datepicker--default')
		const picker = due(page)

		await picker.select('2027-02-14')

		expect(await picker.value()).toBe('February 14th, 2027')
		await expect(picker.trigger).toBeFocused()
		await expect(page.getByRole('dialog')).toHaveCount(0)
	})

	test('should keep the picked date when it is picked again', async ({ page }) => {
		await openStory(page, 'components-datepicker--default')
		const picker = due(page)

		await picker.select('2026-11-20')

		expect(await picker.value()).toBe('November 20th, 2026')
		await expect(page.getByRole('dialog')).toHaveCount(0)
	})

	test('should open on the picked month and dismiss with the value unchanged', async ({
		page,
	}) => {
		await openStory(page, 'components-datepicker--default')
		const picker = due(page)

		const days = await picker.open()
		expect(await days.months()).toEqual(['November 2026'])
		expect(await days.selected()).toEqual(['2026-11-20'])
		await expect(days.day('2026-11-20')).toBeFocused()
		await picker.dismiss()

		await expect(days.root).toBeHidden()
		expect(await picker.value()).toBe('November 20th, 2026')
	})

	test('should refuse to pick a disabled day instead of waiting on it', async ({ page }) => {
		await openStory(page, 'components-datepicker--disabled-days')

		await expect(due(page).select('2026-11-14')).rejects.toThrow(/disabled/)
	})

	test('should pick from the keyboard', async ({ page }) => {
		await openStory(page, 'components-datepicker--default')
		const picker = due(page)

		await picker.trigger.focus()
		await page.keyboard.press('Enter')
		const days = await picker.open()
		await expect(days.day('2026-11-20')).toBeFocused()
		await page.keyboard.press('ArrowLeft')
		await page.keyboard.press('Enter')

		await expect(days.root).toBeHidden()
		expect(await picker.value()).toBe('November 19th, 2026')
		await expect(picker.trigger).toBeFocused()
	})
})
