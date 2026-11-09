// node_modules
import { expect, type Page, test } from '@playwright/test'

// testee
import { toggleGroup } from '../../src/testing.js'
// utils
import { openStory } from './__utils__/story.js'

// The Default story's play function leaves "Align center" pressed; Multiple's leaves left and right.
test.describe('toggleGroup(root)', () => {
	const alignment = (page: Page) =>
		toggleGroup(page.getByRole('group', { name: 'Text alignment' }))

	test('should read the pressed items by label', async ({ page }) => {
		await openStory(page, 'components-togglegroup--default')

		expect(await alignment(page).pressed()).toEqual(['Align center'])
	})

	test('should replace the pressed item in a single-value group', async ({ page }) => {
		await openStory(page, 'components-togglegroup--default')
		const group = alignment(page)

		await group.press('Align left')

		expect(await group.pressed()).toEqual(['Align left'])
	})

	test('should leave nothing pressed when the pressed item of a single-value group is released', async ({
		page,
	}) => {
		await openStory(page, 'components-togglegroup--default')
		const group = alignment(page)

		await group.release('Align center')

		expect(await group.pressed()).toEqual([])
	})

	test('should add to the pressed items in a multiple group', async ({ page }) => {
		await openStory(page, 'components-togglegroup--multiple')
		const group = alignment(page)

		await group.press('Align center')

		expect(await group.pressed()).toEqual(['Align left', 'Align center', 'Align right'])
	})

	test('should find no radios: items are toggle buttons even in a single-value group', async ({
		page,
	}) => {
		await openStory(page, 'components-togglegroup--default')
		const group = alignment(page)

		await expect(group.root.getByRole('radio')).toHaveCount(0)
		await expect(group.item('Align center')).toHaveAttribute('aria-pressed', 'true')
	})
})
