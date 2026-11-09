// node_modules
import { expect, type Page, test } from '@playwright/test'

// testee
import { tabs } from '../../src/testing.js'
// utils
import { openStory } from './__utils__/story.js'

// The Default story's play function leaves "Password" selected; Vertical's too.
test.describe('tabs(root)', () => {
	const settings = (page: Page) => tabs(page.getByTestId('tabs'))

	test('should read the selected tab and its panel', async ({ page }) => {
		await openStory(page, 'components-tabs--default')
		const group = settings(page)

		expect(await group.selected()).toBe('Password')
		await expect(group.panel('Password')).toHaveText('Change your password.')
	})

	test('should select a tab and show only its panel', async ({ page }) => {
		await openStory(page, 'components-tabs--default')
		const group = settings(page)

		await group.select('Billing')

		expect(await group.selected()).toBe('Billing')
		await expect(group.panel('Billing')).toHaveText('Manage your plan and invoices.')
		await expect(group.panel('Password')).toHaveCount(0)
	})

	test('should move focus with the arrow keys without selecting', async ({ page }) => {
		await openStory(page, 'components-tabs--default')
		const group = settings(page)

		await group.tab('Password').focus()
		await page.keyboard.press('ArrowRight')

		await expect(group.tab('Billing')).toBeFocused()
		expect(await group.selected()).toBe('Password')
	})

	test('should select the focused tab with Enter', async ({ page }) => {
		await openStory(page, 'components-tabs--vertical')
		const group = settings(page)

		await group.tab('Password').focus()
		await page.keyboard.press('ArrowDown')
		await page.keyboard.press('Enter')

		expect(await group.selected()).toBe('Billing')
	})

	test('should refuse to select a disabled tab instead of waiting on it', async ({ page }) => {
		await openStory(page, 'components-tabs--disabled-tab')

		await expect(settings(page).select('Billing')).rejects.toThrow(/disabled/)
	})
})
