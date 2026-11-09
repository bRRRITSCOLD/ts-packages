import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, screen, waitFor } from 'storybook/test'

import { DataTablePagination } from './data-table-pagination.js'

/** The visible text of each page control, in order: numbers, `…` for a gap. */
const pages = (nav: HTMLElement) =>
	[...nav.querySelectorAll('li')]
		.slice(1, -1)
		.map((li) => (li.querySelector('a') ? (li.textContent ?? '') : '…'))

/**
 * `title` is the library component's Penpot path. Pagination's links: Previous, the first and last
 * pages, the current one and its neighbours, an ellipsis per gap, Next. Previous on the first page
 * and Next on the last are `aria-disabled` and faded. With `onPageSizeChange`, a rows-per-page
 * select comes first. Plain props: `useDataTable`'s `getPaginationProps` supplies them.
 */
const meta = {
	title: 'Components/DataTablePagination',
	component: DataTablePagination,
	args: { pageIndex: 0, pageCount: 10, onPageChange: fn() },
	render: function Render(args) {
		const [pageIndex, setPageIndex] = useState(args.pageIndex)
		return (
			<DataTablePagination
				{...args}
				pageIndex={pageIndex}
				onPageChange={(next) => {
					setPageIndex(next)
					args.onPageChange(next)
				}}
			/>
		)
	},
	play: async ({ args, canvas, userEvent }) => {
		const nav = canvas.getByRole('navigation', { name: 'pagination' })
		await expect(pages(nav)).toEqual(['1', '2', '…', '10'])
		const previous = canvas.getByRole('button', { name: 'Go to previous page' })
		await expect(previous).toHaveAttribute('aria-disabled', 'true')
		await expect(getComputedStyle(previous).opacity).toBe('0.5')
		await expect(canvas.getByRole('button', { name: '1' })).toHaveAttribute(
			'aria-current',
			'page'
		)
		await userEvent.click(canvas.getByRole('button', { name: 'Go to next page' }))
		await expect(args.onPageChange).toHaveBeenLastCalledWith(1)
		await expect(previous).not.toHaveAttribute('aria-disabled')
		await expect(pages(nav)).toEqual(['1', '2', '3', '…', '10'])
	},
} satisfies Meta<typeof DataTablePagination>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** In the middle, a gap on each side of the current page and its neighbours. */
export const Middle: Story = {
	args: { pageIndex: 4 },
	play: async ({ args, canvas, userEvent }) => {
		const nav = canvas.getByRole('navigation', { name: 'pagination' })
		await expect(pages(nav)).toEqual(['1', '…', '4', '5', '6', '…', '10'])
		await userEvent.click(canvas.getByRole('button', { name: '6' }))
		await expect(args.onPageChange).toHaveBeenLastCalledWith(5)
		await expect(canvas.getByRole('button', { name: '6' })).toHaveAttribute(
			'aria-current',
			'page'
		)
	},
}

/** On the last page, Next is disabled and a click on it changes nothing. */
export const LastPage: Story = {
	args: { pageIndex: 9 },
	play: async ({ args, canvas, userEvent }) => {
		const next = canvas.getByRole('button', { name: 'Go to next page' })
		await expect(next).toHaveAttribute('aria-disabled', 'true')
		next.click()
		await expect(args.onPageChange).not.toHaveBeenCalled()
		await expect(pages(canvas.getByRole('navigation', { name: 'pagination' }))).toEqual([
			'1',
			'…',
			'9',
			'10',
		])
	},
}

/** With `onPageSizeChange`, a rows-per-page select. */
export const PageSize: Story = {
	args: { pageSize: 10, onPageSizeChange: fn() },
	play: async ({ args, canvas, userEvent }) => {
		const size = canvas.getByRole('combobox', { name: 'Rows per page' })
		await expect(size).toHaveTextContent('10')
		await userEvent.click(size)
		const listbox = await screen.findByRole('listbox')
		await waitFor(() => expect(listbox).toBeVisible())
		await userEvent.click(screen.getByRole('option', { name: '20' }))
		await expect(args.onPageSizeChange).toHaveBeenCalledWith(20)
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
	},
}
