// node_modules
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// testee
import { type DataTableColumnDef, useDataTable } from '../../src/data-table.js'
// fixtures
import { type Payment, payments } from '../fixtures/payments.js'

const columns: DataTableColumnDef<Payment>[] = [
	{ id: 'select', enableSorting: false, enableHiding: false },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'amount', header: 'Amount' },
	{ accessorKey: 'status', header: 'Status', enableSorting: false },
]

/** Renders the hook over twelve payments; pass `options` to change the rest. */
const render = (options: Partial<Parameters<typeof useDataTable<Payment>>[0]> = {}) => {
	const data = options.data ?? payments()
	return renderHook(() =>
		useDataTable({ data, columns, getRowId: (row) => row.id, pageSize: 5, ...options })
	)
}

type Hook = ReturnType<typeof render>['result']

const emails = (result: Hook) =>
	result.current.table.getRowModel().rows.map((row) => row.original.email)
const column = (result: Hook, id: string) => {
	const found = result.current.table.getColumn(id)
	if (!found) throw new Error(`no column ${id}`)
	return found
}
const header = (result: Hook, id: string) => {
	const found = result.current.table
		.getHeaderGroups()
		.flatMap((group) => group.headers)
		.find((h) => h.column.id === id)
	if (!found) throw new Error(`no header ${id}`)
	return found
}

describe('useDataTable', () => {
	it('should show the first page of rows in data order', () => {
		const { result } = render()

		expect(emails(result)).toEqual([
			'ken@example.com',
			'abe@example.com',
			'monserrat@example.com',
			'silas@example.com',
			'carmella@example.com',
		])
	})

	describe('getColumnHeaderProps', () => {
		it('should title a column by its header text, unsorted', () => {
			const { result } = render()

			expect(result.current.getColumnHeaderProps(column(result, 'email'))).toMatchObject({
				title: 'Email',
				sort: 'none',
			})
		})

		it('should sort the rows when onSortChange picks a direction, and clear it with none', () => {
			const { result } = render()

			act(() =>
				result.current.getColumnHeaderProps(column(result, 'amount')).onSortChange?.('desc')
			)

			expect(result.current.getColumnHeaderProps(column(result, 'amount')).sort).toBe('desc')
			expect(emails(result)).toEqual([
				'priya@example.com',
				'silas@example.com',
				'monserrat@example.com',
				'carmella@example.com',
				'wanda@example.com',
			])

			act(() =>
				result.current.getColumnHeaderProps(column(result, 'amount')).onSortChange?.('none')
			)

			expect(result.current.getColumnHeaderProps(column(result, 'amount')).sort).toBe('none')
			expect(emails(result)[0]).toBe('ken@example.com')
		})

		it('should leave onSortChange out for a column that cannot sort', () => {
			const { result } = render()

			expect(result.current.getColumnHeaderProps(column(result, 'status')).onSortChange).toBe(
				undefined
			)
		})

		it('should hide the column through onHide', () => {
			const { result } = render()

			act(() => result.current.getColumnHeaderProps(column(result, 'email')).onHide?.())

			expect(column(result, 'email').getIsVisible()).toBe(false)
		})
	})

	describe('getHeadProps', () => {
		it('should put aria-sort on the sorted column only', () => {
			const { result } = render()

			act(() =>
				result.current.getColumnHeaderProps(column(result, 'email')).onSortChange?.('asc')
			)

			expect(result.current.getHeadProps(header(result, 'email'))).toEqual({
				colSpan: 1,
				'aria-sort': 'ascending',
			})
			expect(result.current.getHeadProps(header(result, 'amount'))['aria-sort']).toBe(
				undefined
			)

			act(() =>
				result.current.getColumnHeaderProps(column(result, 'email')).onSortChange?.('desc')
			)

			expect(result.current.getHeadProps(header(result, 'email'))['aria-sort']).toBe(
				'descending'
			)
		})
	})

	describe('getToolbarProps', () => {
		it('should filter the rows across columns and go back to the first page', () => {
			const { result } = render()
			act(() => result.current.getPaginationProps().onPageChange(1))

			act(() => result.current.getToolbarProps().onFilterChange('ar'))

			expect(result.current.getToolbarProps().filter).toBe('ar')
			expect(emails(result)).toEqual(['carmella@example.com', 'omar@example.com'])
			expect(result.current.getPaginationProps()).toMatchObject({
				pageIndex: 0,
				pageCount: 1,
			})
		})
	})

	describe('getPaginationProps', () => {
		it('should count the pages and move between them', () => {
			const { result } = render()

			expect(result.current.getPaginationProps()).toMatchObject({
				pageIndex: 0,
				pageCount: 3,
				pageSize: 5,
			})

			act(() => result.current.getPaginationProps().onPageChange(2))

			expect(result.current.getPaginationProps().pageIndex).toBe(2)
			expect(emails(result)).toEqual(['wanda@example.com', 'yusuf@example.com'])
		})

		it('should change the page size', () => {
			const { result } = render()

			act(() => result.current.getPaginationProps().onPageSizeChange?.(10))

			expect(result.current.getPaginationProps()).toMatchObject({
				pageSize: 10,
				pageCount: 2,
			})
			expect(emails(result)).toHaveLength(10)
		})

		it('should count one page when there are no rows', () => {
			const { result } = render({ data: [] })

			expect(result.current.getPaginationProps().pageCount).toBe(1)
		})
	})

	describe('getViewOptionsProps', () => {
		it('should list the columns that can hide, by header text, and toggle them', () => {
			const { result } = render()

			expect(result.current.getViewOptionsProps().columns).toEqual([
				{ id: 'email', label: 'Email', visible: true },
				{ id: 'amount', label: 'Amount', visible: true },
				{ id: 'status', label: 'Status', visible: true },
			])

			act(() => result.current.getViewOptionsProps().onVisibilityChange('amount', false))

			expect(result.current.getViewOptionsProps().columns[1]).toEqual({
				id: 'amount',
				label: 'Amount',
				visible: false,
			})
			expect(result.current.table.getVisibleLeafColumns().map((c) => c.id)).toEqual([
				'select',
				'email',
				'status',
			])
		})
	})

	describe('row selection', () => {
		it('should select a row through its checkbox props and mark the row selected', () => {
			const { result } = render()
			const firstRow = () => result.current.table.getRowModel().rows[0]!

			act(() => result.current.getRowSelectProps(firstRow()).onCheckedChange(true))

			expect(result.current.getRowSelectProps(firstRow())).toMatchObject({
				checked: true,
				'aria-label': 'Select row',
			})
			expect(result.current.getRowProps(firstRow())).toEqual({ 'data-state': 'selected' })
			expect(result.current.getSelectAllProps()).toMatchObject({
				checked: false,
				indeterminate: true,
			})
		})

		it('should select every row of the page through the select-all props', () => {
			const { result } = render()

			act(() => result.current.getSelectAllProps().onCheckedChange(true))

			expect(result.current.getSelectAllProps()).toMatchObject({
				checked: true,
				indeterminate: false,
				'aria-label': 'Select all',
			})
			expect(Object.keys(result.current.table.state.rowSelection)).toEqual([
				'pay-1',
				'pay-2',
				'pay-3',
				'pay-4',
				'pay-5',
			])
		})

		it('should leave an unselected row unmarked', () => {
			const { result } = render()

			expect(result.current.getRowProps(result.current.table.getRowModel().rows[0]!)).toEqual(
				{
					'data-state': undefined,
				}
			)
		})
	})
})
