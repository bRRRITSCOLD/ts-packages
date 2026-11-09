// node_modules
import { expect, test } from '@playwright/test'

// testee
import { dialog, popover } from '../../src/testing.js'
// utils
import { openStory } from './__utils__/story.js'

// Each story's play function opens its popover, so every test starts with it on screen.
test.describe('popover(root)', () => {
	test('should fill a field in the popover and dismiss it', async ({ page }) => {
		await openStory(page, 'components-popover--default')
		const dimensions = popover(page.getByRole('dialog', { name: 'Dimensions' }))

		await dimensions.field('Width').fill('50%')
		await expect(dimensions.field('Width')).toHaveValue('50%')
		await dimensions.dismiss()

		await expect(dimensions.root).toBeHidden()
		await expect(page.getByRole('button', { name: 'Dimensions' })).toBeFocused()
	})

	test.describe('Base UI trap 1: Escape closes only the top layer', () => {
		test('should dismiss a popover and leave the dialog that opened it open', async ({
			page,
		}) => {
			await openStory(page, 'components-popover--in-dialog')
			const layer = dialog(page.getByRole('dialog', { name: 'Edit layer' }))
			const dimensions = popover(page.getByRole('dialog', { name: 'Dimensions' }))

			await dimensions.dismiss()

			await expect(dimensions.root).toBeHidden()
			await expect(layer.root).toBeVisible()
			await layer.dismiss()
			await expect(layer.root).toBeHidden()
		})

		test('should close the popover, not the dialog, on a click elsewhere in the dialog', async ({
			page,
		}) => {
			await openStory(page, 'components-popover--in-dialog')
			const layer = dialog(page.getByRole('dialog', { name: 'Edit layer' }))
			const dimensions = popover(page.getByRole('dialog', { name: 'Dimensions' }))

			await layer.root.getByText("Change the layer's size.").click()

			await expect(dimensions.root).toBeHidden()
			await expect(layer.root).toBeVisible()
		})
	})
})
