// node_modules
import { expect, test } from '@playwright/test'

// testee
import { dialog, toast } from '../../src/testing.js'
// utils
import { openStory } from './__utils__/story.js'

test.describe('toast(page)', () => {
	test('should read a toast by its text and close it', async ({ page }) => {
		await openStory(page, 'components-toast--with-description')
		const toasts = toast(page)

		expect(await toasts.read('Event created')).toEqual({
			title: 'Event created',
			description: 'Sunday, December 3 at 9:00 AM',
			priority: 'low',
		})
		await toasts.close('Event created')

		await expect(toasts.get('Event created')).toBeHidden()
	})

	test("should click a toast's action by name", async ({ page }) => {
		await openStory(page, 'components-toast--with-action')
		const toasts = toast(page)

		await toasts.button('Message archived', 'Undo').click()

		await expect(toasts.get('Message archived')).toBeVisible()
	})

	test('should list stacked toasts newest first', async ({ page }) => {
		await openStory(page, 'components-toast--stacked')

		expect(await toast(page).titles()).toEqual(['Third', 'Second', 'First'])
	})

	test.describe('Base UI trap 3: each toast is a dialog in the Notifications region', () => {
		test('should show a low-priority toast as a dialog an unscoped role lookup also matches', async ({
			page,
		}) => {
			await openStory(page, 'components-toast--default')
			const toasts = toast(page)
			// The story's play function closes its toast; show another.
			await page.getByRole('button', { name: 'Show toast' }).click()

			expect((await toasts.read('Event created')).priority).toBe('low')
			await expect(toasts.region.getByRole('dialog', { name: 'Event created' })).toBeVisible()
			await expect(page.getByRole('dialog')).toHaveCount(1)
			await expect(toasts.announcer('Event created')).toHaveCount(0)
		})

		test('should hide a high-priority alertdialog until the viewport is focused, announcing it meanwhile', async ({
			page,
		}) => {
			await openStory(page, 'components-toast--high-priority')
			const toasts = toast(page)

			expect(await toasts.read('Connection lost')).toEqual({
				title: 'Connection lost',
				description: 'Reconnecting…',
				priority: 'high',
			})
			await expect(toasts.get('Connection lost')).toHaveAttribute('aria-hidden', 'true')
			await expect(page.getByRole('alertdialog')).toHaveCount(0)
			await expect(toasts.announcer('Connection lost')).toHaveText(
				'Connection lostReconnecting…'
			)

			await page.keyboard.press('F6')

			await expect(page.getByRole('alertdialog', { name: 'Connection lost' })).toBeVisible()
			await expect(toasts.announcer('Connection lost')).toHaveCount(0)
		})

		test('should close a high-priority toast through its hidden close button', async ({
			page,
		}) => {
			await openStory(page, 'components-toast--high-priority')
			const toasts = toast(page)

			await toasts.close('Connection lost')

			await expect(toasts.get('Connection lost')).toBeHidden()
			await expect(toasts.announcer('Connection lost')).toHaveCount(0)
		})
	})

	test.describe('Base UI trap 2: the toast viewport is exempt from a dialog’s aria-hidden', () => {
		test('should keep a toast shown from an open dialog reachable by role', async ({
			page,
		}) => {
			await openStory(page, 'components-toast--in-dialog')
			const profile = dialog(page.getByRole('dialog', { name: 'Edit profile' }))
			const toasts = toast(page)

			await expect(profile.root).toBeVisible()
			// A role lookup skips aria-hidden subtrees, so finding these proves neither is hidden.
			await expect(page.getByRole('region', { name: 'Notifications' })).toHaveCount(1)
			await expect(page.getByRole('dialog', { name: 'Profile saved' })).toBeVisible()
			expect((await toasts.read('Profile saved')).priority).toBe('low')

			await toasts.close('Profile saved')

			await expect(toasts.get('Profile saved')).toBeHidden()
			await expect(profile.root).toBeVisible()
		})
	})
})
