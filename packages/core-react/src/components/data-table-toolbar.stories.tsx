import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn } from 'storybook/test'

import { Button } from './button.js'
import { DataTableToolbar } from './data-table-toolbar.js'

/**
 * `title` is the library component's Penpot path. A `searchbox` filter, a Reset button while the
 * filter has text, and the children at the end (`DataTableViewOptions`, an app's actions). Plain
 * props: `useDataTable`'s `getToolbarProps` supplies `filter` and `onFilterChange`.
 */
const meta = {
	title: 'Components/DataTableToolbar',
	component: DataTableToolbar,
	args: { filter: '', onFilterChange: fn(), filterLabel: 'Filter payments' },
	render: function Render(args) {
		const [filter, setFilter] = useState(args.filter)
		return (
			<DataTableToolbar
				{...args}
				filter={filter}
				onFilterChange={(next) => {
					setFilter(next)
					args.onFilterChange(next)
				}}
			>
				<Button variant="outline" size="sm">
					Export
				</Button>
			</DataTableToolbar>
		)
	},
	play: async ({ args, canvas, userEvent }) => {
		const search = canvas.getByRole('searchbox', { name: 'Filter payments' })
		await expect(search).toHaveAttribute('placeholder', 'Filter payments…')
		await expect(canvas.queryByRole('button', { name: 'Reset' })).toBeNull()
		await userEvent.type(search, 'ken')
		await expect(args.onFilterChange).toHaveBeenLastCalledWith('ken')
		await expect(search.getBoundingClientRect().height).toBe(32)
		await expect(canvas.getByRole('button', { name: 'Export' })).toBeVisible()
	},
} satisfies Meta<typeof DataTableToolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** With text in the filter, Reset clears it. */
export const Filtered: Story = {
	args: { filter: 'ken' },
	play: async ({ args, canvas, userEvent }) => {
		const search = canvas.getByRole('searchbox', { name: 'Filter payments' })
		await expect(search).toHaveValue('ken')
		await userEvent.click(canvas.getByRole('button', { name: 'Reset' }))
		await expect(args.onFilterChange).toHaveBeenLastCalledWith('')
		await expect(search).toHaveValue('')
		await expect(canvas.queryByRole('button', { name: 'Reset' })).toBeNull()
	},
}
