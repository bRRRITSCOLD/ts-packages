'use client'

// No registry item: shadcn's date picker is a composition in its docs (Popover, Button and
// Calendar), packaged here with plain props so it has one export and one library twin. The
// trigger follows base-vega's example (an outline Button, a calendar icon before the label,
// `font-normal`) with its width on a token, `w-72` (`space.72`, the example field's width), and
// the docs demo's muted placeholder (`data-[empty=true]:text-muted-foreground`). The popup is
// `PopoverContent` at `w-auto p-0`, as both examples have it. Single date only; a range is the
// app's composition of Popover and `Calendar mode="range"`.

import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import * as React from 'react'
import type { Matcher } from 'react-day-picker'
import { cn } from '../lib/utils.js'
import { Button } from './button.js'
import { Calendar } from './calendar.js'
import { Popover, PopoverContent, PopoverTrigger } from './popover.js'

type DatePickerProps = Omit<
	React.ComponentProps<'button'>,
	'value' | 'defaultValue' | 'onChange' | 'children'
> & {
	/** The picked date; `null` for none. Leave it out to let the picker hold its own value. */
	value?: Date | null
	/** The date an uncontrolled picker starts with. */
	defaultValue?: Date
	/** Called with the picked date, or `undefined` when the picked day is clicked again. */
	onValueChange?: (value: Date | undefined) => void
	/** What the trigger shows with no date picked. */
	placeholder?: string
	/** Days that can't be picked: a date, a range, a weekday rule, or a function (react-day-picker's `Matcher`). */
	disabledDays?: Matcher | Matcher[]
	/** How the trigger shows the picked date; date-fns's `PPP` (`November 9th, 2026`) by default. */
	formatValue?: (value: Date) => string
}

function DatePicker({
	value,
	defaultValue,
	onValueChange,
	placeholder = 'Pick a date',
	disabledDays,
	formatValue = (date) => format(date, 'PPP'),
	className,
	...props
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false)
	const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
	const selected = value === undefined ? uncontrolled : (value ?? undefined)

	const pick = (date: Date | undefined) => {
		setUncontrolled(date)
		onValueChange?.(date)
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						data-slot="date-picker"
						data-empty={!selected}
						className={cn(
							'w-72 justify-start font-normal data-[empty=true]:text-muted-foreground',
							className
						)}
						{...props}
					/>
				}
			>
				<CalendarIcon data-icon="inline-start" />
				{selected ? formatValue(selected) : <span>{placeholder}</span>}
			</PopoverTrigger>
			<PopoverContent
				className="w-auto p-0"
				align="start"
				aria-label={placeholder}
				// DayPicker's `autoFocus` puts focus on the picked day (else today, else the month's
				// first day), the grid's tab stop, so the arrow keys move from there.
				initialFocus={false}
			>
				<Calendar
					mode="single"
					selected={selected}
					onSelect={pick}
					defaultMonth={selected}
					disabled={disabledDays}
					autoFocus
				/>
			</PopoverContent>
		</Popover>
	)
}

export { DatePicker }
