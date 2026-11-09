import type { Meta, StoryObj } from '@storybook/react-vite'
import { type ComponentProps, useState } from 'react'
import { expect, fn, screen, waitFor } from 'storybook/test'

import { DataTableColumnHeader, type DataTableSort } from './data-table-column-header.js'
import { Table, TableHead, TableHeader, TableRow } from './table.js'

/** A header cell holding the column header, as a data table places it. */
const InHeader = (args: ComponentProps<typeof DataTableColumnHeader>) => (
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>
					<DataTableColumnHeader {...args} />
				</TableHead>
			</TableRow>
		</TableHeader>
	</Table>
)

/**
 * `title` is the library component's Penpot path; one story per `sort` value, and one that can't
 * sort. The title is a ghost button opening a menu: Asc, Desc and None as radio items (the current
 * order checked; a pick closes the menu) and Hide when `onHide` is passed. Its icon follows `sort`:
 * `ChevronsUpDown`, `ArrowUp`, `ArrowDown`. Plain props: `useDataTable`'s `getColumnHeaderProps`
 * supplies them, and its `getHeadProps` puts `aria-sort` on the `th`.
 */
const meta = {
	title: 'Components/DataTableColumnHeader',
	component: DataTableColumnHeader,
	args: { title: 'Email', sort: 'none', onSortChange: fn(), onHide: fn() },
	render: function Render(args) {
		const [sort, setSort] = useState<DataTableSort>(args.sort ?? 'none')
		return (
			<InHeader
				{...args}
				sort={sort}
				onSortChange={
					args.onSortChange &&
					((next) => {
						setSort(next)
						args.onSortChange?.(next)
					})
				}
			/>
		)
	},
	play: async ({ args, canvas, userEvent }) => {
		const trigger = canvas.getByRole('button', { name: 'Email' })
		await userEvent.click(trigger)
		const menu = await screen.findByRole('menu')
		await waitFor(() => expect(menu).toBeVisible())
		const current = screen.getByRole('menuitemradio', { checked: true })
		await expect(current).toHaveTextContent(
			{ none: 'None', asc: 'Asc', desc: 'Desc' }[args.sort ?? 'none']
		)
		const next = args.sort === 'desc' ? 'Asc' : 'Desc'
		await userEvent.click(screen.getByRole('menuitemradio', { name: next }))
		await expect(args.onSortChange).toHaveBeenCalledWith(next.toLowerCase())
		await waitFor(() => expect(menu).not.toBeInTheDocument())
	},
} satisfies Meta<typeof DataTableColumnHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Unsorted: Story = {}

export const Ascending: Story = { args: { sort: 'asc' } }

export const Descending: Story = { args: { sort: 'desc' } }

/** Hide calls `onHide`. */
export const Hide: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Email' }))
		const menu = await screen.findByRole('menu')
		await userEvent.click(screen.getByRole('menuitem', { name: 'Hide' }))
		await expect(args.onHide).toHaveBeenCalledOnce()
		await waitFor(() => expect(menu).not.toBeInTheDocument())
	},
}

/** Without `onSortChange` the column can't sort: the header is its title, with no menu. */
export const NotSortable: Story = {
	args: { onSortChange: undefined },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('columnheader', { name: 'Email' })).toBeVisible()
		await expect(canvas.queryByRole('button')).toBeNull()
	},
}
