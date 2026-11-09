// node_modules
import { expect, type Page, test } from '@playwright/test'

// testee
import { dataTable } from '../../src/testing.js'
// utils
import { openStory } from './__utils__/story.js'

// The DataTable story: twelve payments (tests/fixtures/payments.ts), five to a page, columns
// select, Email, Amount and Status (Status can't sort). Its play function leaves no row selected.
test.describe('dataTable(root)', () => {
	const payments = async (page: Page) => {
		await openStory(page, 'components-table--data-table')
		return dataTable(page.getByTestId('data-table'))
	}

	test('should read the columns and the first page of rows', async ({ page }) => {
		const table = await payments(page)

		expect(await table.columns()).toEqual(['', 'Email', 'Amount', 'Status'])
		expect(await table.rows()).toEqual([
			['', 'ken@example.com', '$316.00', 'success'],
			['', 'abe@example.com', '$242.00', 'processing'],
			['', 'monserrat@example.com', '$837.00', 'failed'],
			['', 'silas@example.com', '$874.00', 'pending'],
			['', 'carmella@example.com', '$721.00', 'success'],
		])
		await expect(await table.cell('abe@example.com', 'Amount')).toHaveText('$242.00')
	})

	test.describe('sorting', () => {
		test('should sort by a column through its header menu and mark only that header cell', async ({
			page,
		}) => {
			const table = await payments(page)

			await table.sortBy('Amount', 'desc')

			expect(await table.sort('Amount')).toBe('desc')
			await expect(table.header('Amount')).toHaveAttribute('aria-sort', 'descending')
			await expect(table.header('Amount').getByRole('button')).not.toHaveAttribute(
				'aria-sort'
			)
			expect(await table.sort('Email')).toBe('none')
			await expect(table.header('Email')).not.toHaveAttribute('aria-sort')
			expect((await table.rows()).map((cells) => cells[1])).toEqual([
				'priya@example.com',
				'silas@example.com',
				'monserrat@example.com',
				'carmella@example.com',
				'wanda@example.com',
			])
		})

		test('should switch the sort to another column and clear it with none', async ({
			page,
		}) => {
			const table = await payments(page)
			await table.sortBy('Amount', 'desc')

			await table.sortBy('Email', 'asc')

			expect(await table.sort('Email')).toBe('asc')
			expect(await table.sort('Amount')).toBe('none')
			expect((await table.rows())[0]?.[1]).toBe('abe@example.com')

			await table.sortBy('Email', 'none')

			expect(await table.sort('Email')).toBe('none')
			expect((await table.rows())[0]?.[1]).toBe('ken@example.com')
		})

		test('should show a column that cannot sort as plain text, with no menu', async ({
			page,
		}) => {
			const table = await payments(page)

			await expect(table.header('Status').getByRole('button')).toHaveCount(0)
		})
	})

	test.describe('filtering', () => {
		test('should filter the rows across columns and go back to the first page', async ({
			page,
		}) => {
			const table = await payments(page)
			await table.nextPage()

			await table.filter('ar')

			expect(await table.page()).toBe(1)
			expect((await table.rows()).map((cells) => cells[1])).toEqual([
				'carmella@example.com',
				'omar@example.com',
			])
			expect(await table.pages()).toEqual(['1'])
		})

		test('should show one empty row when nothing matches, and every row once cleared', async ({
			page,
		}) => {
			const table = await payments(page)

			await table.filter('nobody')

			expect(await table.rows()).toEqual([['No results.']])

			await table.filter('')

			expect(await table.rows()).toHaveLength(5)
			expect(await table.pages()).toEqual(['1', '2', '3'])
		})
	})

	test.describe('column visibility', () => {
		test('should hide a column through the View menu and show it again', async ({ page }) => {
			const table = await payments(page)

			await table.toggleColumn('Amount', false)

			expect(await table.columns()).toEqual(['', 'Email', 'Status'])
			expect((await table.rows())[0]).toEqual(['', 'ken@example.com', 'success'])
			await expect(page.getByRole('menu')).toBeHidden()

			await table.toggleColumn('Amount', true)

			expect(await table.columns()).toEqual(['', 'Email', 'Amount', 'Status'])
		})
	})

	test.describe('row selection', () => {
		test('should select rows by their text and read them back', async ({ page }) => {
			const table = await payments(page)

			await table.selectRow('abe@example.com')
			await table.selectRow('silas@example.com')

			expect(await table.selectedRows()).toEqual([
				'abe@example.com $242.00 processing',
				'silas@example.com $874.00 pending',
			])
			await expect(table.row('abe@example.com')).toHaveAttribute('data-state', 'selected')
			await expect(table.table.getByRole('checkbox', { name: 'Select all' })).toHaveAttribute(
				'aria-checked',
				'mixed'
			)

			await table.selectRow('abe@example.com', false)

			expect(await table.selectedRows()).toEqual(['silas@example.com $874.00 pending'])
		})

		test('should select and clear every row of the page through the header checkbox', async ({
			page,
		}) => {
			const table = await payments(page)

			await table.selectAll()

			expect(await table.selectedRows()).toHaveLength(5)

			await table.selectAll(false)

			expect(await table.selectedRows()).toEqual([])
		})
	})

	test.describe('pagination', () => {
		test('should page forward, back and to a page by number', async ({ page }) => {
			const table = await payments(page)
			expect(await table.page()).toBe(1)
			expect(await table.pages()).toEqual(['1', '2', '3'])

			await table.nextPage()

			expect(await table.page()).toBe(2)
			expect((await table.rows())[0]?.[1]).toBe('jason@example.com')

			await table.goToPage(3)

			expect(await table.page()).toBe(3)
			expect((await table.rows()).map((cells) => cells[1])).toEqual([
				'wanda@example.com',
				'yusuf@example.com',
			])

			await table.previousPage()

			expect(await table.page()).toBe(2)
		})

		test('should refuse Previous on the first page and Next on the last instead of waiting', async ({
			page,
		}) => {
			const table = await payments(page)

			await expect(table.previousPage()).rejects.toThrow(/disabled/)

			await table.goToPage(3)

			await expect(table.nextPage()).rejects.toThrow(/disabled/)
		})

		test('should keep the sort across pages', async ({ page }) => {
			const table = await payments(page)
			await table.sortBy('Email', 'asc')

			await table.nextPage()

			expect((await table.rows()).map((cells) => cells[1])).toEqual([
				'monserrat@example.com',
				'omar@example.com',
				'priya@example.com',
				'silas@example.com',
				'tomas@example.com',
			])
		})
	})
})
