// node_modules
import { expect, type Page, test } from '@playwright/test'

// testee
import { accordion } from '../../src/testing.js'
// utils
import { openStory } from './__utils__/story.js'

const SHIPPING = 'What are your shipping options?'
const RETURNS = 'What is your return policy?'
const SUPPORT = 'How do I reach support?'

// The Default story's play function leaves "returns" open; Multiple's leaves shipping and returns.
test.describe('accordion(root)', () => {
	const faq = (page: Page) => accordion(page.getByTestId('faq'))

	test('should read the open items by label', async ({ page }) => {
		await openStory(page, 'components-accordion--multiple')

		expect(await faq(page).expanded()).toEqual([SHIPPING, RETURNS])
	})

	test('should close the open item when another opens in a single-value accordion', async ({
		page,
	}) => {
		await openStory(page, 'components-accordion--default')
		const items = faq(page)

		await items.open(SHIPPING)

		expect(await items.expanded()).toEqual([SHIPPING])
		await expect(items.panel(SHIPPING)).toContainText('Standard shipping')
		await expect(items.panel(RETURNS)).toHaveCount(0)
	})

	test('should unmount a closed panel by the time close returns', async ({ page }) => {
		await openStory(page, 'components-accordion--default')
		const items = faq(page)

		await items.close(RETURNS)

		await expect(items.panel(RETURNS)).toHaveCount(0)
		expect(await items.expanded()).toEqual([])
	})

	test('should refuse to open a disabled item instead of waiting on it', async ({ page }) => {
		await openStory(page, 'components-accordion--disabled-item')

		await expect(faq(page).open(SUPPORT)).rejects.toThrow(/disabled/)
	})

	test('should leave focus put on the arrow keys: each trigger is its own tab stop', async ({
		page,
	}) => {
		await openStory(page, 'components-accordion--dividers')
		const items = faq(page)

		await items.trigger(SHIPPING).focus()
		await page.keyboard.press('ArrowDown')
		await expect(items.trigger(SHIPPING)).toBeFocused()
		await page.keyboard.press('Tab')
		await expect(items.trigger(RETURNS)).toBeFocused()
		await page.keyboard.press('Enter')

		expect(await items.expanded()).toEqual([RETURNS])
	})

	test('should skip a disabled trigger on Tab', async ({ page }) => {
		await openStory(page, 'components-accordion--disabled-item')
		const items = faq(page)

		await items.trigger(RETURNS).focus()
		await page.keyboard.press('Tab')

		await expect(items.trigger(SUPPORT)).not.toBeFocused()
	})
})
