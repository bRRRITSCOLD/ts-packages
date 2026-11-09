import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { DateRange, PropsBase, PropsSingle } from 'react-day-picker'
import { expect, fn, waitFor } from 'storybook/test'

import { Calendar } from './calendar.js'

/** Every story shows November 2026 with the 9th as today, so no story depends on the clock. */
const MONTH = new Date(2026, 10, 1)
const TODAY = new Date(2026, 10, 9)

/** The day cells (`td`, the gridcells) on show, outside days included. */
const cells = (root: HTMLElement) => [...root.querySelectorAll('td')].filter((td) => td.dataset.day)
/** A day's cell in its own month, by its ISO date: never an outside day of the next month. */
const cell = (root: HTMLElement, iso: string) => {
	const found = cells(root).find((td) => td.dataset.day === iso && !('outside' in td.dataset))
	if (!found) throw new Error(`no day ${iso} on show`)
	return found
}
/** A day's button, by its ISO date. */
const day = (root: HTMLElement, iso: string) =>
	cell(root, iso).querySelector('button') as HTMLElement
/** The month a grid shows, read from its label. */
const month = (root: HTMLElement) => root.querySelector('table')?.getAttribute('aria-label')

/** A single-date calendar holding its own pick, as an app's state would. */
function SingleCalendar(props: PropsBase & PropsSingle) {
	const [selected, setSelected] = useState<Date>()
	return (
		<Calendar
			{...props}
			selected={selected}
			onSelect={(...pick: Parameters<NonNullable<PropsSingle['onSelect']>>) => {
				setSelected(pick[0])
				props.onSelect?.(...pick)
			}}
		/>
	)
}

/** The calendar's root, the element react-day-picker marks `rdp-root` (`data-slot="calendar"`). */
const calendarElement = (canvasElement: HTMLElement) =>
	canvasElement.querySelector<HTMLElement>('.rdp-root') as HTMLElement

/**
 * `title` is the library component's Penpot path. Calendar is react-day-picker's `DayPicker` in
 * our classes: a `grid` per month, named by the month, with a gridcell per day holding a ghost
 * `Button`. The picked day is `primary`, today is `muted`, days of the months either side are
 * `muted-foreground`, and a disabled day is faded and ignores the pointer.
 */
const meta = {
	title: 'Components/Calendar',
	component: SingleCalendar,
	args: {
		mode: 'single',
		defaultMonth: MONTH,
		today: TODAY,
		onSelect: fn(),
		'data-testid': 'calendar',
	} as PropsBase & PropsSingle,
	play: async ({ args, canvas, userEvent }) => {
		const calendar = canvas.getByTestId('calendar')
		await expect(canvas.getByRole('grid', { name: 'November 2026' })).toBeVisible()
		const twelfth = day(calendar, '2026-11-12')
		await expect(twelfth.getBoundingClientRect().width).toBe(32)
		await expect(twelfth.getBoundingClientRect().height).toBe(32)
		const resting = getComputedStyle(twelfth).backgroundColor

		await userEvent.click(twelfth)

		await expect(args.onSelect).toHaveBeenCalledOnce()
		await waitFor(() =>
			expect(cell(calendar, '2026-11-12')).toHaveAttribute('aria-selected', 'true')
		)
		await expect(args.onSelect).toHaveBeenCalledWith(
			new Date(2026, 10, 12),
			expect.anything(),
			expect.anything(),
			expect.anything()
		)
		await waitFor(() => expect(getComputedStyle(twelfth).backgroundColor).not.toBe(resting))
		// A pick re-renders the calendar in place: its parts keep their elements.
		await expect(twelfth.isConnected).toBe(true)
	},
} satisfies Meta<typeof SingleCalendar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Today is `muted` behind its number; days of the months either side are `muted-foreground`. */
export const TodayAndOutsideDays: Story = {
	play: async ({ canvasElement }) => {
		const root = calendarElement(canvasElement)
		const today = cell(root, '2026-11-09')
		const plain = cell(root, '2026-11-10')
		await expect(today).toHaveAttribute('data-today', 'true')
		await expect(getComputedStyle(today).backgroundColor).not.toBe(
			getComputedStyle(plain).backgroundColor
		)
		const outside = cells(root).find((td) => td.dataset.day === '2026-12-01')
		await expect(outside).toHaveAttribute('data-outside', 'true')
		await expect(getComputedStyle(outside as HTMLElement).color).not.toBe(
			getComputedStyle(plain).color
		)
	},
}

/** The nav buttons step a month at a time; the grid is named by the month it shows. */
export const MonthNavigation: Story = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		const root = calendarElement(canvasElement)
		await userEvent.click(canvas.getByRole('button', { name: /next month/i }))
		await expect(month(root)).toBe('December 2026')
		await userEvent.click(canvas.getByRole('button', { name: /previous month/i }))
		await userEvent.click(canvas.getByRole('button', { name: /previous month/i }))
		await expect(month(root)).toBe('October 2026')
	},
}

/**
 * The days a `disabled` matcher picks (here weekends and before the 5th) are faded and native
 * disabled buttons, so a click picks nothing.
 */
export const DisabledDays: Story = {
	args: { disabled: [{ dayOfWeek: [0, 6] }, { before: new Date(2026, 10, 5) }] },
	play: async ({ args, canvasElement }) => {
		const root = calendarElement(canvasElement)
		const saturday = day(root, '2026-11-14')
		await expect(saturday).toBeDisabled()
		await expect(day(root, '2026-11-03')).toBeDisabled()
		await expect(getComputedStyle(cell(root, '2026-11-14')).opacity).toBe('0.5')
		await expect(day(root, '2026-11-16')).toBeEnabled()
		saturday.click()
		await expect(args.onSelect).not.toHaveBeenCalled()
		await expect(cell(root, '2026-11-14')).not.toHaveAttribute('aria-selected')
	},
}

/**
 * From the keyboard the grid is one tab stop, on the picked day, else today: the arrow keys move
 * a day or a week, Page Down the next month, and Enter picks the focused day.
 */
export const Keyboard: Story = {
	play: async ({ args, canvasElement, userEvent }) => {
		const root = calendarElement(canvasElement)
		await userEvent.tab()
		await userEvent.tab()
		await userEvent.tab()
		await expect(day(root, '2026-11-09')).toHaveFocus()
		await userEvent.keyboard('{ArrowRight}')
		await expect(day(root, '2026-11-10')).toHaveFocus()
		await userEvent.keyboard('{ArrowDown}')
		await expect(day(root, '2026-11-17')).toHaveFocus()
		await userEvent.keyboard('{Enter}')
		await waitFor(() =>
			expect(cell(root, '2026-11-17')).toHaveAttribute('aria-selected', 'true')
		)
		await expect(args.onSelect).toHaveBeenCalledOnce()
		await userEvent.keyboard('{PageDown}')
		await waitFor(() => expect(month(root)).toBe('December 2026'))
		await waitFor(() => expect(day(root, '2026-12-17')).toHaveFocus())
	},
}

/**
 * `mode="range"`: the ends are `primary`, the days between `muted`, and the cells behind them
 * join into one band.
 */
export const Range: Story = {
	render: function Render() {
		const [range, setRange] = useState<DateRange | undefined>({
			from: new Date(2026, 10, 10),
			to: new Date(2026, 10, 13),
		})
		return (
			<Calendar
				mode="range"
				defaultMonth={MONTH}
				today={TODAY}
				selected={range}
				onSelect={setRange}
			/>
		)
	},
	play: async ({ canvasElement }) => {
		const root = calendarElement(canvasElement)
		const start = day(root, '2026-11-10')
		const middle = day(root, '2026-11-11')
		const end = day(root, '2026-11-13')
		await expect(start).toHaveAttribute('data-range-start', 'true')
		await expect(middle).toHaveAttribute('data-range-middle', 'true')
		await expect(end).toHaveAttribute('data-range-end', 'true')
		await expect(getComputedStyle(start).backgroundColor).toBe(
			getComputedStyle(end).backgroundColor
		)
		await expect(getComputedStyle(middle).backgroundColor).not.toBe(
			getComputedStyle(start).backgroundColor
		)
		await expect(getComputedStyle(middle).borderTopLeftRadius).toBe('0px')
	},
}

/** Two months side by side: one nav for both, a grid per month. */
export const TwoMonths: Story = {
	render: () => <Calendar mode="single" defaultMonth={MONTH} today={TODAY} numberOfMonths={2} />,
	play: async ({ canvas }) => {
		await expect(
			canvas.getAllByRole('grid').map((grid) => grid.getAttribute('aria-label'))
		).toEqual(['November 2026', 'December 2026'])
	},
}

/** `captionLayout="dropdown"`: the caption is a month and a year select. */
export const Dropdowns: Story = {
	render: () => (
		<Calendar
			mode="single"
			defaultMonth={MONTH}
			today={TODAY}
			captionLayout="dropdown"
			startMonth={new Date(2020, 0)}
			endMonth={new Date(2030, 11)}
		/>
	),
	play: async ({ canvas, canvasElement, userEvent }) => {
		const root = calendarElement(canvasElement)
		await userEvent.selectOptions(canvas.getByRole('combobox', { name: /month/i }), 'Mar')
		await userEvent.selectOptions(canvas.getByRole('combobox', { name: /year/i }), '2028')
		await expect(month(root)).toBe('March 2028')
	},
}
