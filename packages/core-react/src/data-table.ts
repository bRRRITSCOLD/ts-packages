'use client'

// The `./data-table` entry: `useDataTable`, the one importer of `@tanstack/react-table` (the unit
// tier's TanStack boundary check holds it to that). It wraps TanStack Table v9's `useTable` with
// sorting, a global filter, pagination, row selection and column visibility, and hands the
// engine-agnostic primitives in `.` their plain props through prop getters. Code only: no library
// twin, on the drift allowlist.
import {
	type Cell,
	type CellData,
	type Column,
	type ColumnDef,
	columnFilteringFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFn_includesString,
	flexRender,
	globalFilteringFeature,
	type Header,
	type Row,
	type RowData,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_basic,
	sortFn_datetime,
	sortFn_text,
	tableFeatures,
	useTable,
} from '@tanstack/react-table'
import type * as React from 'react'

import type { Checkbox } from './components/checkbox.js'
import type { DataTableColumnHeader, DataTableSort } from './components/data-table-column-header.js'
import type { DataTablePagination } from './components/data-table-pagination.js'
import type { DataTableToolbar } from './components/data-table-toolbar.js'
import type { DataTableViewOptions } from './components/data-table-view-options.js'
import type { TableHead } from './components/table.js'

/** The TanStack features every data table registers. Module scope: TanStack needs it stable. */
const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: {
		alphanumeric: sortFn_alphanumeric,
		basic: sortFn_basic,
		datetime: sortFn_datetime,
		text: sortFn_text,
	},
	columnFilteringFeature,
	globalFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	filterFns: { includesString: filterFn_includesString },
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
	rowSelectionFeature,
	columnVisibilityFeature,
})

/** The feature registry `useDataTable` builds its table with. */
export type DataTableFeatures = typeof features

/** A column of a data table: a TanStack column definition over `useDataTable`'s features. */
// biome-ignore lint/suspicious/noExplicitAny: one column list mixes accessor value types.
export type DataTableColumnDef<TData extends RowData, TValue extends CellData = any> = ColumnDef<
	DataTableFeatures,
	TData,
	TValue
>

export type UseDataTableOptions<TData extends RowData> = {
	/** The rows. Keep the array stable between renders (state or a memo): a new one recomputes. */
	data: TData[]
	/** The columns. Keep the array stable between renders, as with `data`. */
	columns: DataTableColumnDef<TData>[]
	/** A row's id, kept across sorting and pages; selection is keyed by it. Defaults to the index. */
	getRowId?: (row: TData, index: number) => string
	/** Rows per page at first. Defaults to 10. */
	pageSize?: number
}

type DataTableColumn<TData extends RowData> = Column<DataTableFeatures, TData>
type DataTableHeader<TData extends RowData> = Header<DataTableFeatures, TData, CellData>
type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>

/** A column's label: its header when that is text, its id otherwise. */
const titleOf = <TData extends RowData>(column: DataTableColumn<TData>): string =>
	typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const

/**
 * A data table over `data` and `columns`, client-side: sorting, a global filter, pagination, row
 * selection and column visibility. Returns the TanStack `table` (render `table.getHeaderGroups()`
 * and `table.getRowModel().rows` into `Table`'s parts) and a prop getter per primitive, so app
 * code never reaches into TanStack to wire them:
 *
 * - `getHeadProps(header)` → `TableHead`: `colSpan`, and `aria-sort` on the sorted column's cell.
 * - `getColumnHeaderProps(column)` → `DataTableColumnHeader`.
 * - `getRowProps(row)` → `TableRow`: `data-state="selected"` on a selected row.
 * - `getSelectAllProps()` / `getRowSelectProps(row)` → `Checkbox`, in a selection column.
 * - `getToolbarProps()` → `DataTableToolbar`, `getViewOptionsProps()` → `DataTableViewOptions`,
 *   `getPaginationProps()` → `DataTablePagination`.
 * - `renderHeader(header)` / `renderCell(cell)` render a column's own `header` / `cell`.
 */
export function useDataTable<TData extends RowData>({
	data,
	columns,
	getRowId,
	pageSize = 10,
}: UseDataTableOptions<TData>) {
	const table = useTable({
		features,
		data,
		columns,
		getRowId,
		globalFilterFn: 'includesString',
		initialState: { pagination: { pageIndex: 0, pageSize } },
	})

	return {
		table,

		getHeadProps: (header: DataTableHeader<TData>) => {
			const sorted = header.column.getIsSorted()
			return {
				colSpan: header.colSpan,
				'aria-sort': sorted ? ARIA_SORT[sorted] : undefined,
			} satisfies React.ComponentProps<typeof TableHead>
		},

		getColumnHeaderProps: (column: DataTableColumn<TData>) =>
			({
				title: titleOf(column),
				sort: column.getIsSorted() || 'none',
				onSortChange: column.getCanSort()
					? (sort: DataTableSort) =>
							sort === 'none'
								? column.clearSorting()
								: column.toggleSorting(sort === 'desc')
					: undefined,
				onHide: column.getCanHide() ? () => column.toggleVisibility(false) : undefined,
			}) satisfies React.ComponentProps<typeof DataTableColumnHeader>,

		getRowProps: (row: DataTableRow<TData>) => ({
			'data-state': row.getIsSelected() ? ('selected' as const) : undefined,
		}),

		getSelectAllProps: () =>
			({
				'aria-label': 'Select all',
				checked: table.getIsAllPageRowsSelected(),
				indeterminate:
					table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
				onCheckedChange: (checked: boolean) => table.toggleAllPageRowsSelected(checked),
			}) satisfies React.ComponentProps<typeof Checkbox>,

		getRowSelectProps: (row: DataTableRow<TData>) =>
			({
				'aria-label': 'Select row',
				checked: row.getIsSelected(),
				disabled: !row.getCanSelect(),
				onCheckedChange: (checked: boolean) => row.toggleSelected(checked),
			}) satisfies React.ComponentProps<typeof Checkbox>,

		getToolbarProps: () =>
			({
				filter: String(table.state.globalFilter ?? ''),
				// A new filter starts from the first page; set here, not left to TanStack's lazy reset.
				onFilterChange: (filter: string) => {
					table.setGlobalFilter(filter)
					table.setPageIndex(0)
				},
			}) satisfies React.ComponentProps<typeof DataTableToolbar>,

		getViewOptionsProps: () =>
			({
				columns: table
					.getAllLeafColumns()
					.filter((column) => column.getCanHide())
					.map((column) => ({
						id: column.id,
						label: titleOf(column),
						visible: column.getIsVisible(),
					})),
				onVisibilityChange: (id: string, visible: boolean) =>
					table.getColumn(id)?.toggleVisibility(visible),
			}) satisfies React.ComponentProps<typeof DataTableViewOptions>,

		getPaginationProps: () =>
			({
				pageIndex: table.state.pagination.pageIndex,
				pageCount: Math.max(1, table.getPageCount()),
				onPageChange: (pageIndex: number) => table.setPageIndex(pageIndex),
				pageSize: table.state.pagination.pageSize,
				onPageSizeChange: (size: number) => table.setPageSize(size),
			}) satisfies React.ComponentProps<typeof DataTablePagination>,

		renderHeader: (header: DataTableHeader<TData>) =>
			header.isPlaceholder
				? null
				: flexRender(header.column.columnDef.header, header.getContext()),

		renderCell: (cell: Cell<DataTableFeatures, TData, CellData>) =>
			flexRender(cell.column.columnDef.cell, cell.getContext()),
	}
}

/** What `useDataTable` returns. */
export type DataTable<TData extends RowData> = ReturnType<typeof useDataTable<TData>>
