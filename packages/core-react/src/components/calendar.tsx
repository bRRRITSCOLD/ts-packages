'use client'

// Vendored from shadcn's base-vega registry (react-day-picker, on Button). Kept close to upstream
// so a re-pull diffs cleanly; the edits put it on tokens (see README → Vendoring):
// - the element-local `[--cell-size:--spacing(8)]` and `[--cell-radius:var(--radius-md)]` are the
//   steps they mean: `size-8` / `h-8` / `px-8` / `min-w-8` / `w-8` (32px, `space.8`) and
//   `rounded-md` (and its `-l` / `-r` sides). `--spacing(…)` reads Tailwind's `--spacing`, which
//   the theme clears, so upstream's cells had no size.
// - base-vega's `cn-calendar-*` style hooks are inlined as the classes the style gives them
//   (the dropdown root's border and focus ring, the dropdown caption's `h-8 pr-1 pl-2`), and
//   `cn-rtl-flip` is dropped: the root's `rtl:` rules already turn the chevrons.
// - the weekday and week-number `text-[0.8rem]` is `text-xs` (12px, upstream's 12.8px),
//   `ring-[3px]` is `ring-3`, and a day's sub-label `[&>span]:opacity-70` is `opacity-50` (no
//   `opacity.70` token).
// - icons are lucide's, through `lucide-react` as everywhere else.
// - the day button takes the `ref` upstream makes and never passes, so the focus effect works
//   and the arrow keys move focus; its name is the date in the locale's full style (see
//   `labelDayButton`), unless the caller or the locale names it.
// - the custom parts (root, chevron, week number, day button) are components declared once, not
//   arrow functions in the `components` prop: DayPicker renders whatever function it is handed,
//   so a new one each render remounted the whole calendar on every pick, focus move and hover.

import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import * as React from 'react'
import {
	type DayButton,
	DayPicker,
	getDefaultClassNames,
	type Labels,
	type Locale,
} from 'react-day-picker'
import { cn } from '../lib/utils.js'
import { Button, buttonVariants } from './button.js'

/**
 * A day button's name, the date in the locale's full style (`Thursday, November 12, 2026`), so it
 * holds the number the button shows. react-day-picker's default (`PPPP`) says `November 12th`,
 * and axe's label-content-name-mismatch (WCAG 2.5.3) fails a `12` named `12th`.
 */
const labelDayButton: NonNullable<Labels['labelDayButton']> = (date, modifiers, options) => {
	let label = new Intl.DateTimeFormat(options?.locale?.code, { dateStyle: 'full' }).format(date)
	if (modifiers.today) label = `Today, ${label}`
	if (modifiers.selected) label = `${label}, selected`
	return label
}

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	captionLayout = 'label',
	buttonVariant = 'ghost',
	locale,
	formatters,
	labels,
	components,
	...props
}: React.ComponentProps<typeof DayPicker> & {
	buttonVariant?: React.ComponentProps<typeof Button>['variant']
}) {
	const defaultClassNames = getDefaultClassNames()
	const labelCaption = captionLayout === 'label'
	const LocaleDayButton = React.useMemo(
		() => (props: React.ComponentProps<typeof DayButton>) => (
			<CalendarDayButton locale={locale} {...props} />
		),
		[locale]
	)

	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn(
				'group/calendar bg-background p-3 in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent',
				String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
				String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
				className
			)}
			captionLayout={captionLayout}
			locale={locale}
			formatters={{
				formatMonthDropdown: (date) =>
					date.toLocaleString(locale?.code, { month: 'short' }),
				...formatters,
			}}
			labels={locale?.labels?.labelDayButton ? labels : { labelDayButton, ...labels }}
			classNames={{
				root: cn('w-fit', defaultClassNames.root),
				months: cn('relative flex flex-col gap-4 md:flex-row', defaultClassNames.months),
				month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
				nav: cn(
					'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
					defaultClassNames.nav
				),
				button_previous: cn(
					buttonVariants({ variant: buttonVariant }),
					'size-8 p-0 select-none aria-disabled:opacity-50',
					defaultClassNames.button_previous
				),
				button_next: cn(
					buttonVariants({ variant: buttonVariant }),
					'size-8 p-0 select-none aria-disabled:opacity-50',
					defaultClassNames.button_next
				),
				month_caption: cn(
					'flex h-8 w-full items-center justify-center px-8',
					defaultClassNames.month_caption
				),
				dropdowns: cn(
					'flex h-8 w-full items-center justify-center gap-1.5 text-sm font-medium',
					defaultClassNames.dropdowns
				),
				dropdown_root: cn(
					'relative rounded-md border border-input shadow-xs has-focus:border-ring has-focus:ring-3 has-focus:ring-ring/50',
					defaultClassNames.dropdown_root
				),
				dropdown: cn('absolute inset-0 bg-popover opacity-0', defaultClassNames.dropdown),
				caption_label: cn(
					'font-medium select-none',
					labelCaption
						? 'text-sm'
						: 'flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground',
					defaultClassNames.caption_label
				),
				month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
				weekdays: cn('flex', defaultClassNames.weekdays),
				weekday: cn(
					'flex-1 rounded-md text-xs font-normal text-muted-foreground select-none',
					defaultClassNames.weekday
				),
				week: cn('mt-2 flex w-full', defaultClassNames.week),
				week_number_header: cn('w-8 select-none', defaultClassNames.week_number_header),
				week_number: cn(
					'text-xs text-muted-foreground select-none',
					defaultClassNames.week_number
				),
				day: cn(
					'group/day relative aspect-square h-full w-full rounded-md p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-md',
					props.showWeekNumber
						? '[&:nth-child(2)[data-selected=true]_button]:rounded-l-md'
						: '[&:first-child[data-selected=true]_button]:rounded-l-md',
					defaultClassNames.day
				),
				range_start: cn(
					'relative isolate z-0 rounded-l-md bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted',
					defaultClassNames.range_start
				),
				range_middle: cn('rounded-none', defaultClassNames.range_middle),
				range_end: cn(
					'relative isolate z-0 rounded-r-md bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted',
					defaultClassNames.range_end
				),
				today: cn(
					'rounded-md bg-muted text-foreground data-[selected=true]:rounded-none',
					defaultClassNames.today
				),
				outside: cn(
					'text-muted-foreground aria-selected:text-muted-foreground',
					defaultClassNames.outside
				),
				disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
				hidden: cn('invisible', defaultClassNames.hidden),
				...classNames,
			}}
			components={{
				Root: CalendarRoot,
				Chevron: CalendarChevron,
				DayButton: LocaleDayButton,
				WeekNumber: CalendarWeekNumber,
				...components,
			}}
			{...props}
		/>
	)
}

function CalendarRoot({
	className,
	rootRef,
	...props
}: React.ComponentProps<'div'> & { rootRef?: React.Ref<HTMLDivElement> }) {
	return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
}

function CalendarChevron({
	className,
	orientation,
	...props
}: React.ComponentProps<'svg'> & {
	orientation?: 'up' | 'down' | 'left' | 'right'
	size?: number
}) {
	if (orientation === 'left') {
		return <ChevronLeftIcon className={cn('size-4', className)} {...props} />
	}

	if (orientation === 'right') {
		return <ChevronRightIcon className={cn('size-4', className)} {...props} />
	}

	return <ChevronDownIcon className={cn('size-4', className)} {...props} />
}

function CalendarWeekNumber({
	children,
	week: _week,
	...props
}: React.ComponentProps<'td'> & { week: unknown }) {
	return (
		<td {...props}>
			<div className="flex size-8 items-center justify-center text-center">{children}</div>
		</td>
	)
}

function CalendarDayButton({
	className,
	day,
	modifiers,
	locale,
	...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
	const defaultClassNames = getDefaultClassNames()

	const ref = React.useRef<HTMLButtonElement>(null)
	React.useEffect(() => {
		if (modifiers.focused) ref.current?.focus()
	}, [modifiers.focused])

	return (
		<Button
			ref={ref}
			variant="ghost"
			size="icon"
			data-day={day.date.toLocaleDateString(locale?.code)}
			data-selected-single={
				modifiers.selected &&
				!modifiers.range_start &&
				!modifiers.range_end &&
				!modifiers.range_middle
			}
			data-range-start={modifiers.range_start}
			data-range-end={modifiers.range_end}
			data-range-middle={modifiers.range_middle}
			className={cn(
				'relative isolate z-10 flex aspect-square size-auto w-full min-w-8 flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-3 group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground [&>span]:text-xs [&>span]:opacity-50',
				defaultClassNames.day,
				className
			)}
			{...props}
		/>
	)
}

export { Calendar, CalendarDayButton }
