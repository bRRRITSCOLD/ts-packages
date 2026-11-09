'use client'

// A data table's pagination, after shadcn's data-table guide (no registry item), on Pagination
// and Select. Plain props, never TanStack: `useDataTable`'s `getPaginationProps` supplies them, or
// an app passes its own. Departures from the guide (see README → Vendoring): pages are
// Pagination's numbered links (the first, the last, the current page and its neighbours, an
// ellipsis for each gap) with Previous and Next, not first/previous/next/last icon buttons and
// "Page x of y"; the rows-per-page select shows only with `onPageSizeChange`; the selected-row
// count is the app's. Pagination's links are `<a>`s with no `disabled`, so Previous on the first
// page and Next on the last are `aria-disabled`, faded and ignore the pointer.

import * as React from 'react'
import { cn } from '../lib/utils.js'
import { Label } from './label.js'
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from './pagination.js'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select.js'

/** The page indexes to show, in order: the first, the last, the current and its neighbours; `null` is a gap. */
const pageRange = (pageIndex: number, pageCount: number): (number | null)[] => {
	const shown = [...new Set([0, pageIndex - 1, pageIndex, pageIndex + 1, pageCount - 1])]
		.filter((page) => page >= 0 && page < pageCount)
		.sort((a, b) => a - b)
	const range: (number | null)[] = []
	let previous = -1
	for (const page of shown) {
		// A gap of one page shows that page: an ellipsis would take the same room.
		if (page - previous === 2) range.push(previous + 1)
		else if (page - previous > 2) range.push(null)
		range.push(page)
		previous = page
	}
	return range
}

const DISABLED = 'aria-disabled:pointer-events-none aria-disabled:opacity-50'

function DataTablePagination({
	pageIndex,
	pageCount,
	onPageChange,
	pageSize,
	pageSizeOptions = [10, 20, 30, 40, 50],
	onPageSizeChange,
	className,
	...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
	/** The current page, from 0. */
	pageIndex: number
	/** How many pages there are, at least 1. */
	pageCount: number
	/** Called with the page index to show. */
	onPageChange: (pageIndex: number) => void
	/** Rows per page, shown in the rows-per-page select. */
	pageSize?: number
	pageSizeOptions?: number[]
	/** Called with the rows per page picked. Without it there is no rows-per-page select. */
	onPageSizeChange?: (pageSize: number) => void
}) {
	const sizeId = React.useId()
	const first = pageIndex <= 0
	const last = pageIndex >= pageCount - 1
	return (
		<div
			data-slot="data-table-pagination"
			className={cn('flex flex-wrap items-center gap-4', className)}
			{...props}
		>
			{onPageSizeChange ? (
				<div className="flex items-center gap-2">
					<Label htmlFor={sizeId}>Rows per page</Label>
					<Select
						items={pageSizeOptions.map((size) => ({
							value: size,
							label: String(size),
						}))}
						value={pageSize}
						onValueChange={(size) => {
							if (typeof size === 'number') onPageSizeChange(size)
						}}
					>
						<SelectTrigger id={sizeId} size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{pageSizeOptions.map((size) => (
								<SelectItem key={size} value={size}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			) : null}
			<Pagination className="mr-0 w-auto">
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious
							aria-disabled={first || undefined}
							className={DISABLED}
							onClick={() => {
								if (!first) onPageChange(pageIndex - 1)
							}}
						/>
					</PaginationItem>
					{pageRange(pageIndex, pageCount).map((page, i) =>
						page === null ? (
							<PaginationItem key={`gap-${i}`}>
								<PaginationEllipsis />
							</PaginationItem>
						) : (
							<PaginationItem key={page}>
								<PaginationLink
									isActive={page === pageIndex}
									onClick={() => onPageChange(page)}
								>
									{page + 1}
								</PaginationLink>
							</PaginationItem>
						)
					)}
					<PaginationItem>
						<PaginationNext
							aria-disabled={last || undefined}
							className={DISABLED}
							onClick={() => {
								if (!last) onPageChange(pageIndex + 1)
							}}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	)
}

export { DataTablePagination }
