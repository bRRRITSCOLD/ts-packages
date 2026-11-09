import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, within } from 'storybook/test'

import { type Payment, payments } from '../../tests/fixtures/payments.js'
import { type DataTableColumnDef, useDataTable } from '../data-table.js'
import { Checkbox } from './checkbox.js'
import { DataTableColumnHeader } from './data-table-column-header.js'
import { DataTablePagination } from './data-table-pagination.js'
import { DataTableToolbar } from './data-table-toolbar.js'
import { DataTableViewOptions } from './data-table-view-options.js'
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from './table.js'

const INVOICES = [
	{ invoice: 'INV001', status: 'Paid', method: 'Credit card', amount: '$250.00' },
	{ invoice: 'INV002', status: 'Pending', method: 'PayPal', amount: '$150.00' },
	{ invoice: 'INV003', status: 'Unpaid', method: 'Bank transfer', amount: '$350.00' },
]

/**
 * `title` is the library component's Penpot path. A plain `<table>` in a scrolling container, with
 * header, body, footer and caption parts; a row is muted on hover and when `data-state` is
 * `selected`. The DataTable story builds the data table from `useDataTable` and the primitives.
 */
const meta = {
	title: 'Components/Table',
	component: Table,
	render: (args) => (
		<Table {...args}>
			<TableCaption>A list of your recent invoices.</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>Invoice</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Method</TableHead>
					<TableHead className="text-right">Amount</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{INVOICES.map((row) => (
					<TableRow
						key={row.invoice}
						data-state={row.invoice === 'INV002' ? 'selected' : undefined}
					>
						<TableCell className="font-medium">{row.invoice}</TableCell>
						<TableCell>{row.status}</TableCell>
						<TableCell>{row.method}</TableCell>
						<TableCell className="text-right">{row.amount}</TableCell>
					</TableRow>
				))}
			</TableBody>
			<TableFooter>
				<TableRow>
					<TableCell colSpan={3}>Total</TableCell>
					<TableCell className="text-right">$750.00</TableCell>
				</TableRow>
			</TableFooter>
		</Table>
	),
	play: async ({ canvas }) => {
		const table = canvas.getByRole('table', { name: 'A list of your recent invoices.' })
		await expect(within(table).getAllByRole('columnheader')).toHaveLength(4)
		const rows = within(table).getAllByRole('row')
		await expect(rows).toHaveLength(5)
		const [, first, selected] = rows as HTMLElement[]
		// `data-state="selected"` mutes the row; the others stay clear.
		await expect(getComputedStyle(selected as HTMLElement).backgroundColor).not.toBe(
			getComputedStyle(first as HTMLElement).backgroundColor
		)
		const head = within(table).getByRole('columnheader', { name: 'Invoice' })
		await expect(head.getBoundingClientRect().height).toBe(40)
	},
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const COLUMNS: DataTableColumnDef<Payment>[] = [
	{ id: 'select', enableSorting: false, enableHiding: false },
	{ accessorKey: 'email', header: 'Email' },
	{
		accessorKey: 'amount',
		header: 'Amount',
		cell: ({ row }) => money.format(row.original.amount),
	},
	{ accessorKey: 'status', header: 'Status', enableSorting: false },
]

/** The data table every app builds: `useDataTable` feeding Table and the four primitives. */
function PaymentsTable() {
	const [data] = useState(() => payments())
	const dataTable = useDataTable({
		data,
		columns: COLUMNS,
		getRowId: (row) => row.id,
		pageSize: 5,
	})
	const { table } = dataTable
	const rows = table.getRowModel().rows
	return (
		<div data-testid="data-table" className="flex flex-col gap-4">
			<DataTableToolbar {...dataTable.getToolbarProps()} filterLabel="Filter payments">
				<DataTableViewOptions {...dataTable.getViewOptionsProps()} />
			</DataTableToolbar>
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((group) => (
						<TableRow key={group.id}>
							{group.headers.map((header) => (
								<TableHead key={header.id} {...dataTable.getHeadProps(header)}>
									{header.column.id === 'select' ? (
										<Checkbox {...dataTable.getSelectAllProps()} />
									) : (
										<DataTableColumnHeader
											{...dataTable.getColumnHeaderProps(header.column)}
										/>
									)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{rows.length ? (
						rows.map((row) => (
							<TableRow key={row.id} {...dataTable.getRowProps(row)}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{cell.column.id === 'select' ? (
											<Checkbox {...dataTable.getRowSelectProps(row)} />
										) : (
											dataTable.renderCell(cell)
										)}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={table.getVisibleLeafColumns().length}>
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
			<DataTablePagination
				{...dataTable.getPaginationProps()}
				pageSizeOptions={[5, 10, 20]}
			/>
		</div>
	)
}

/**
 * A data table: filter, sortable and hideable columns, row selection and pages, from
 * `useDataTable` in `./data-table` and the primitives in `.`. Code only: the data table has no
 * library twin of its own; its parts do. `aria-sort` sits on the sorted column's `th`.
 */
export const DataTable: Story = {
	render: () => <PaymentsTable />,
	play: async ({ canvas, userEvent }) => {
		const table = canvas.getByRole('table')
		const body = within(table).getAllByRole('rowgroup')[1] as HTMLElement
		await expect(within(body).getAllByRole('row')).toHaveLength(5)
		await expect(within(table).getAllByRole('columnheader')).toHaveLength(4)
		for (const head of within(table).getAllByRole('columnheader'))
			await expect(head).not.toHaveAttribute('aria-sort')
		await expect(canvas.getByRole('button', { name: '1' })).toHaveAttribute(
			'aria-current',
			'page'
		)

		// Selecting a row mutes it; clearing it again leaves the story where it started.
		const [first] = within(body).getAllByRole('row') as HTMLElement[]
		const select = within(first as HTMLElement).getByRole('checkbox', { name: 'Select row' })
		await userEvent.click(select)
		await expect(first).toHaveAttribute('data-state', 'selected')
		await expect(canvas.getByRole('checkbox', { name: 'Select all' })).toHaveAttribute(
			'aria-checked',
			'mixed'
		)
		await userEvent.click(select)
		await expect(first).not.toHaveAttribute('data-state')
	},
}
