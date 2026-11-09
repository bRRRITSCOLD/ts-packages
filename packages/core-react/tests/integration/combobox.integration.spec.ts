// node_modules
import { expect, test } from '@playwright/test'

// testee
import { combobox, dialog } from '../../src/testing.js'
// utils
import { openStory } from './__utils__/story.js'

test.describe('combobox(input)', () => {
	test('should filter the options by label and pick one', async ({ page }) => {
		await openStory(page, 'components-combobox--default')
		const framework = combobox(page.getByRole('combobox', { name: 'Framework' }))

		await framework.filter('')
		expect(await framework.options()).toEqual([
			'Next.js',
			'SvelteKit',
			'Nuxt',
			'Remix',
			'Astro',
		])
		await framework.filter('n')
		expect(await framework.options()).toEqual(['Next.js', 'Nuxt'])
		await framework.select('Nuxt')

		expect(await framework.value()).toBe('Nuxt')
		await expect(page.getByRole('listbox')).toBeHidden()
	})

	test.describe('Base UI trap 4: options carry no value; multiple closes on a pick', () => {
		test('should add a chip per label, reopening the popup for each', async ({ page }) => {
			await openStory(page, 'components-combobox--multiple')
			const frameworks = combobox(page.getByRole('combobox', { name: 'Frameworks' }))

			await frameworks.select('Remix', 'Astro')

			expect(await frameworks.chips()).toEqual(['Next.js', 'Nuxt', 'Remix', 'Astro'])
			expect(await frameworks.value()).toBe('')
		})

		test('should close the popup and clear the filter after a pick', async ({ page }) => {
			await openStory(page, 'components-combobox--multiple')
			const frameworks = combobox(page.getByRole('combobox', { name: 'Frameworks' }))

			const listbox = await frameworks.filter('rem')
			await listbox.getByRole('option', { name: 'Remix' }).click()

			await expect(listbox).toBeHidden()
			await expect(frameworks.input).toHaveValue('')
		})
	})

	test.describe('Base UI trap 1: Escape closes only the top layer', () => {
		test('should dismiss the popup and leave the dialog that opened it open', async ({
			page,
		}) => {
			await openStory(page, 'components-combobox--in-dialog')
			const project = dialog(page.getByRole('dialog', { name: 'Edit project' }))
			const framework = combobox(project.root.getByRole('combobox', { name: 'Framework' }))

			await framework.dismiss()

			await expect(page.getByRole('listbox')).toBeHidden()
			await expect(project.root).toBeVisible()
			await project.dismiss()
			await expect(project.root).toBeHidden()
		})

		test('should close the popup, not the dialog, on a click elsewhere in the dialog', async ({
			page,
		}) => {
			await openStory(page, 'components-combobox--in-dialog')
			const project = dialog(page.getByRole('dialog', { name: 'Edit project' }))
			const listbox = page.getByRole('listbox')
			await expect(listbox).toBeVisible()

			await project.root.getByText("Change the project's framework.").click()

			await expect(listbox).toBeHidden()
			await expect(project.root).toBeVisible()
		})
	})
})
