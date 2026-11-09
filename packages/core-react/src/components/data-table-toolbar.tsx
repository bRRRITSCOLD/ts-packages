'use client'

// A data table's toolbar, after shadcn's data-table guide (no registry item), on Input and
// Button. Plain props, never TanStack: `useDataTable`'s `getToolbarProps` supplies them, or an
// app passes its own. Departures from the guide (see README → Vendoring): one text filter (the
// guide filtered a column; `useDataTable` filters every column), a `search` input so it is a
// `searchbox` with the browser's own clear button hidden (Reset clears it), and the input's
// `w-[150px] lg:w-[250px]` is `w-full max-w-xs` (`size.xs`, 320px). Children sit at the end:
// `DataTableViewOptions`, an app's own actions.

import { XIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '../lib/utils.js'
import { Button } from './button.js'
import { Input } from './input.js'

function DataTableToolbar({
	filter,
	onFilterChange,
	filterLabel = 'Filter',
	className,
	children,
	...props
}: React.ComponentProps<'div'> & {
	/** The filter's text. */
	filter: string
	onFilterChange: (filter: string) => void
	/** The filter input's accessible name; its placeholder adds an ellipsis. */
	filterLabel?: string
}) {
	return (
		<div
			data-slot="data-table-toolbar"
			className={cn('flex items-center justify-between gap-2', className)}
			{...props}
		>
			<div className="flex flex-1 items-center gap-2">
				<Input
					type="search"
					aria-label={filterLabel}
					placeholder={`${filterLabel}…`}
					value={filter}
					onChange={(event) => onFilterChange(event.target.value)}
					className="h-8 w-full max-w-xs [&::-webkit-search-cancel-button]:appearance-none"
				/>
				{filter ? (
					<Button variant="ghost" size="sm" onClick={() => onFilterChange('')}>
						Reset
						<XIcon data-icon="inline-end" />
					</Button>
				) : null}
			</div>
			{children ? <div className="flex items-center gap-2">{children}</div> : null}
		</div>
	)
}

export { DataTableToolbar }
