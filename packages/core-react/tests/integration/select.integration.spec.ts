// node_modules
import { expect, test } from '@playwright/test'

// testee
import { dialog, select } from '../../src/testing.js'
// utils
import { openStory } from './__utils__/story.js'

test.describe('select(trigger)', () => {
	test('should read the options and pick one by label', async ({ page }) => {
		await openStory(page, 'components-select--small')
		const produce = select(page.getByRole('combobox', { name: 'Produce' }))

		expect(await produce.value()).toBe('Pick one')
		expect(await produce.options()).toEqual([
			'Apple',
			'Banana',
			'Blueberry',
			'Grapes',
			'Carrot',
			'Leek',
		])
		await produce.select('Leek')

		expect(await produce.value()).toBe('Leek')
		await expect(page.getByRole('listbox')).toBeHidden()
	})

	test.describe('Base UI trap 6: Select has hidden inputs', () => {
		test('should submit the picked value through the hidden input it never fills', async ({
			page,
		}) => {
			await openStory(page, 'components-select--small')
			const produce = select(page.getByRole('combobox', { name: 'Produce' }))

			await produce.select('Blueberry')

			await expect(page.locator('input[aria-hidden="true"]')).toHaveValue('blueberry')
		})
	})

	test.describe('Base UI trap 1: Escape closes only the top layer', () => {
		test('should dismiss the select and leave the dialog that opened it open', async ({
			page,
		}) => {
			await openStory(page, 'components-select--in-dialog')
			const order = dialog(page.getByRole('dialog', { name: 'Edit order' }))
			const produce = select(order.root.getByRole('combobox', { name: 'Produce' }))

			await produce.dismiss()

			await expect(page.getByRole('listbox')).toBeHidden()
			await expect(order.root).toBeVisible()
		})

		test('should close the select, not the dialog, on a click outside the popup', async ({
			page,
		}) => {
			await openStory(page, 'components-select--in-dialog')
			const order = dialog(page.getByRole('dialog', { name: 'Edit order' }))
			const listbox = page.getByRole('listbox')
			await expect(listbox).toBeVisible()

			await page.mouse.click(5, 5)

			await expect(listbox).toBeHidden()
			await expect(order.root).toBeVisible()
		})
	})
})
