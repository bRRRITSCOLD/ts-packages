'use client'

// A data table's column visibility menu, after shadcn's data-table guide (no registry item), on
// DropdownMenu and Button. Plain props, never TanStack: `useDataTable`'s `getViewOptionsProps`
// supplies them, or an app passes its own. Departures from the guide (see README → Vendoring):
// the trigger is always shown (the guide's `hidden lg:flex` is an app's call) and its `h-8` is
// Button size `sm`'s own; the menu's `w-[150px]` is `w-36` (`space.36`, 144px); an item shows the
// column's label, not its capitalised id; the label sits in a group, as Base UI's group label needs.

import { Settings2Icon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '../lib/utils.js'
import { Button } from './button.js'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './dropdown-menu.js'

/** A column the menu can show or hide. */
type DataTableViewColumn = { id: string; label: string; visible: boolean }

function DataTableViewOptions({
	columns,
	onVisibilityChange,
	className,
	...props
}: Omit<React.ComponentProps<typeof Button>, 'children' | 'variant' | 'size'> & {
	/** The columns that can hide, in order. */
	columns: DataTableViewColumn[]
	onVisibilityChange: (id: string, visible: boolean) => void
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						data-slot="data-table-view-options"
						variant="outline"
						size="sm"
						className={cn('ml-auto', className)}
						{...props}
					/>
				}
			>
				<Settings2Icon data-icon="inline-start" />
				View
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-36">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{columns.map((column) => (
						<DropdownMenuCheckboxItem
							key={column.id}
							checked={column.visible}
							onCheckedChange={(visible) => onVisibilityChange(column.id, visible)}
						>
							{column.label}
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export { type DataTableViewColumn, DataTableViewOptions }
