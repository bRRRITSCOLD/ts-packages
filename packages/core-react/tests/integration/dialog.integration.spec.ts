// node_modules
import { expect, test } from '@playwright/test'

// testee
import { dialog } from '../../src/testing.js'
// utils
import { openStory } from './__utils__/story.js'

// Each story's play function opens its dialogs, so every test starts with them on screen.
test.describe('dialog(root)', () => {
	test('should fill a field in the dialog and dismiss it', async ({ page }) => {
		await openStory(page, 'components-dialog--default')
		const profile = dialog(page.getByRole('dialog', { name: 'Edit profile' }))

		await profile.field('Name').fill('Ada')
		await expect(profile.field('Name')).toHaveValue('Ada')
		await expect(profile.button('Save changes')).toBeEnabled()
		await profile.dismiss()

		await expect(profile.root).toBeHidden()
	})

	test('should drive an alert dialog the same way', async ({ page }) => {
		await openStory(page, 'components-alert-dialog--default')
		await page.getByRole('button', { name: 'Delete account' }).click()
		const confirm = dialog(page.getByRole('alertdialog', { name: 'Delete your account?' }))

		await confirm.button('Cancel').click()

		await expect(confirm.root).toBeHidden()
	})

	test.describe('Base UI trap 1: Escape closes only the top layer', () => {
		test('should dismiss a nested dialog and leave the dialog under it open', async ({
			page,
		}) => {
			await openStory(page, 'components-dialog--nested')
			const profile = dialog(page.getByRole('dialog', { name: 'Edit profile' }))
			const avatar = dialog(page.getByRole('dialog', { name: 'Change avatar' }))

			await avatar.dismiss()

			await expect(avatar.root).toBeHidden()
			await expect(profile.root).toBeVisible()
			await profile.dismiss()
			await expect(profile.root).toBeHidden()
		})

		test('should dismiss an alert dialog and leave the dialog that opened it open', async ({
			page,
		}) => {
			await openStory(page, 'components-alert-dialog--in-dialog')
			const profile = dialog(page.getByRole('dialog', { name: 'Edit profile' }))
			const confirm = dialog(page.getByRole('alertdialog', { name: 'Delete your account?' }))

			await confirm.dismiss()

			await expect(confirm.root).toBeHidden()
			await expect(profile.root).toBeVisible()
		})

		test('should wait for a covered dialog to be the top layer before dismissing it', async ({
			page,
		}) => {
			await openStory(page, 'components-dialog--nested')
			const profile = dialog(page.getByRole('dialog', { name: 'Edit profile' }))
			const avatar = dialog(page.getByRole('dialog', { name: 'Change avatar' }))

			// The covered dialog is aria-hidden, so its root is hidden until the nested one closes.
			const dismissing = profile.dismiss()
			await avatar.button('Close').click()
			await dismissing

			await expect(avatar.root).toBeHidden()
			await expect(profile.root).toBeHidden()
		})
	})

	test.describe('Base UI trap 2: the page is aria-hidden, not inert', () => {
		test('should reach the field in the dialog, not its twin on the page', async ({ page }) => {
			await openStory(page, 'components-dialog--over-matching-page')
			const profile = dialog(page.getByRole('dialog', { name: 'Edit profile' }))

			// The page's own field still matches an unscoped lookup.
			await expect(page.getByLabel('Name')).toHaveCount(2)
			await profile.field('Name').fill('Ada')
			await profile.dismiss()

			await expect(page.getByLabel('Name')).toHaveValue('')
		})
	})

	test.describe('Base UI trap 5: an exit animation keeps a closed dialog mounted', () => {
		test('should return from dismiss only once the dialog is hidden', async ({ page }) => {
			await openStory(page, 'components-dialog--default')
			const profile = dialog(page.getByRole('dialog', { name: 'Edit profile' }))

			await profile.dismiss()

			// Read once, without auto-waiting, to prove dismiss() waited out the animation; a spec
			// itself asserts closed with `toBeHidden()`.
			expect(await profile.root.isVisible()).toBe(false)
		})
	})

	test.describe('Base UI trap 7: data-testid reaches parts, not Root', () => {
		test('should find the dialog by the testid on its content', async ({ page }) => {
			await openStory(page, 'components-dialog--test-ids')
			const profile = dialog(page.getByTestId('profile__dialog__content'))

			await expect(page.getByTestId('profile__dialog__root')).toHaveCount(0)
			await expect(page.getByTestId('profile__dialog__trigger')).toHaveRole('button')
			await expect(profile.root).toHaveRole('dialog')
			await profile.dismiss()
			await expect(profile.root).toBeHidden()
		})
	})
})
