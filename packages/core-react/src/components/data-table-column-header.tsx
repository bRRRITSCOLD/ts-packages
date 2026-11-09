'use client'

// A data table's column header, after shadcn's data-table guide (no registry item), on
// DropdownMenu and Button. Plain props, never TanStack: `useDataTable`'s `getColumnHeaderProps`
// supplies them, or an app passes its own. Departures from the guide (see README → Vendoring):
// `sort` is a prop with a `none` value and the menu is a radio group (Asc, Desc, None) that shows
// the current order and closes on a pick; the guide's `data-[state=open]:bg-accent` is dropped,
// as Base UI sets no `data-state` and Button's ghost variant already styles `aria-expanded`; the
// trigger's `h-8` is Button size `sm`'s own. `aria-sort` belongs on the `th` around this, not here:
// `getHeadProps` puts it there.

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, EyeOffIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '../lib/utils.js'
import { Button } from './button.js'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './dropdown-menu.js'

/** A column's sort order. */
type DataTableSort = 'none' | 'asc' | 'desc'

const SORT_ICON = {
	none: ChevronsUpDownIcon,
	asc: ArrowUpIcon,
	desc: ArrowDownIcon,
} satisfies Record<DataTableSort, unknown>

function DataTableColumnHeader({
	title,
	sort = 'none',
	onSortChange,
	onHide,
	className,
	...props
}: Omit<React.ComponentProps<'div'>, 'children' | 'title'> & {
	/** The column's label. */
	title: string
	sort?: DataTableSort
	/** Called with the order picked. Without it the header is plain text: the column can't sort. */
	onSortChange?: (sort: DataTableSort) => void
	/** Hides the column; adds a Hide item to the menu. */
	onHide?: () => void
}) {
	if (!onSortChange) {
		return (
			<div data-slot="data-table-column-header" className={cn(className)} {...props}>
				{title}
			</div>
		)
	}
	const SortIcon = SORT_ICON[sort]
	return (
		<div
			data-slot="data-table-column-header"
			data-sort={sort}
			className={cn('flex items-center gap-2', className)}
			{...props}
		>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={<Button variant="ghost" size="sm" className="-ml-3" />}
				>
					<span>{title}</span>
					<SortIcon />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuRadioGroup
						value={sort}
						onValueChange={(value: DataTableSort) => onSortChange(value)}
					>
						<DropdownMenuRadioItem value="asc" closeOnClick>
							<ArrowUpIcon />
							Asc
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="desc" closeOnClick>
							<ArrowDownIcon />
							Desc
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="none" closeOnClick>
							<ChevronsUpDownIcon />
							None
						</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
					{onHide ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={onHide}>
								<EyeOffIcon />
								Hide
							</DropdownMenuItem>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}

export { DataTableColumnHeader, type DataTableSort }
