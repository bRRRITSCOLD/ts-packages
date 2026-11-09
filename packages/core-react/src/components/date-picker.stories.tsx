import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, screen, waitFor } from 'storybook/test'

import { DatePicker } from './date-picker.js'
import { Field, FieldLabel } from './field.js'

/** The open picker's popup, named by the placeholder, once its enter animation is done. */
const openPopup = async (name = 'Pick a date') => {
	const popup = await screen.findByRole('dialog', { name })
	await waitFor(() => expect(popup).toBeVisible())
	return popup
}
/** A day's button in the open popup, by its ISO date, in its own month. */
const day = (popup: HTMLElement, iso: string) =>
	[...popup.querySelectorAll('td')]
		.find((td) => td.dataset.day === iso && !('outside' in td.dataset))
		?.querySelector('button') as HTMLElement

/**
 * `title` is the library component's Penpot path. DatePicker is an outline `Button` that opens a
 * `Popover` holding a single-date `Calendar`: the trigger shows the picked date (date-fns `PPP`)
 * or the placeholder in `muted-foreground`; a pick closes the popup and returns focus to the
 * trigger. Plain props: `value` / `defaultValue`, `onValueChange`, `placeholder`, `disabled`,
 * `disabledDays`, `formatValue`.
 */
const meta = {
	title: 'Components/DatePicker',
	component: DatePicker,
	args: { defaultValue: new Date(2026, 10, 9), onValueChange: fn() },
	render: (args) => (
		<Field className="w-72">
			<FieldLabel htmlFor="due">Due date</FieldLabel>
			<DatePicker id="due" data-testid="due" {...args} />
		</Field>
	),
	play: async ({ args, canvas, userEvent }) => {
		const trigger = canvas.getByTestId('due')
		await expect(trigger).toHaveTextContent('November 9th, 2026')
		await expect(trigger.getBoundingClientRect().width).toBe(288)
		await userEvent.click(trigger)
		const popup = await openPopup()
		await expect(trigger).toHaveAttribute('aria-expanded', 'true')
		// Focus lands on the picked day, the grid's tab stop.
		await waitFor(() => expect(day(popup, '2026-11-09')).toHaveFocus())
		await userEvent.click(day(popup, '2026-11-20'))
		await expect(args.onValueChange).toHaveBeenCalledWith(new Date(2026, 10, 20))
		await waitFor(() => expect(popup).not.toBeInTheDocument())
		await expect(trigger).toHaveTextContent('November 20th, 2026')
		await expect(trigger).toHaveFocus()
	},
} satisfies Meta<typeof DatePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** With nothing picked, the trigger shows the placeholder in `muted-foreground`. */
export const Empty: Story = {
	args: { defaultValue: undefined, placeholder: 'Pick a due date' },
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByTestId('due')
		await expect(trigger).toHaveTextContent('Pick a due date')
		await expect(trigger).toHaveAttribute('data-empty', 'true')
		const empty = getComputedStyle(trigger).color
		await userEvent.click(trigger)
		const popup = await openPopup('Pick a due date')
		// The grid's one tab stop: today, as nothing is picked.
		const tabStop = [...popup.querySelectorAll('td button')].find(
			(button) => (button as HTMLElement).tabIndex === 0
		)
		await userEvent.click(tabStop as HTMLElement)
		await waitFor(() => expect(popup).not.toBeInTheDocument())
		await expect(trigger).toHaveAttribute('data-empty', 'false')
		await expect(getComputedStyle(trigger).color).not.toBe(empty)
	},
}

/**
 * The days `disabledDays` picks (here weekends) can't be picked; Escape closes the popup with
 * the value unchanged.
 */
export const DisabledDays: Story = {
	args: { disabledDays: { dayOfWeek: [0, 6] } },
	play: async ({ args, canvas, userEvent }) => {
		const trigger = canvas.getByTestId('due')
		await userEvent.click(trigger)
		const popup = await openPopup()
		const saturday = day(popup, '2026-11-14')
		await expect(saturday).toBeDisabled()
		saturday.click()
		await expect(args.onValueChange).not.toHaveBeenCalled()
		await userEvent.keyboard('{Escape}')
		await waitFor(() => expect(popup).not.toBeInTheDocument())
		await expect(trigger).toHaveTextContent('November 9th, 2026')
	},
}

/** A disabled picker is a disabled button: it doesn't open. */
export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvas }) => {
		const trigger = canvas.getByTestId('due')
		await expect(trigger).toBeDisabled()
		await expect(getComputedStyle(trigger).opacity).toBe('0.5')
		trigger.click()
		await expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	},
}

/**
 * From the keyboard: Enter on the trigger opens the popup on the picked day, the arrow keys move
 * between days, Page Down to the next month, Enter picks and closes, and focus returns to the
 * trigger.
 */
export const Keyboard: Story = {
	play: async ({ args, canvas, userEvent }) => {
		const trigger = canvas.getByTestId('due')
		trigger.focus()
		await userEvent.keyboard('{Enter}')
		const popup = await openPopup()
		await waitFor(() => expect(day(popup, '2026-11-09')).toHaveFocus())
		await userEvent.keyboard('{ArrowRight}')
		await waitFor(() => expect(day(popup, '2026-11-10')).toHaveFocus())
		await userEvent.keyboard('{PageDown}')
		await waitFor(() => expect(day(popup, '2026-12-10')).toHaveFocus())
		await userEvent.keyboard('{Enter}')
		await expect(args.onValueChange).toHaveBeenCalledWith(new Date(2026, 11, 10))
		await waitFor(() => expect(popup).not.toBeInTheDocument())
		await expect(trigger).toHaveTextContent('December 10th, 2026')
		await expect(trigger).toHaveFocus()
	},
}

/** Controlled: the app holds the value, here as state, and can clear it. */
export const Controlled: Story = {
	render: function Render(args) {
		const [value, setValue] = useState<Date | null>(new Date(2026, 10, 9))
		return (
			<Field className="w-72">
				<FieldLabel htmlFor="due">Due date</FieldLabel>
				<DatePicker
					id="due"
					data-testid="due"
					value={value}
					onValueChange={(next) => {
						setValue(next ?? null)
						args.onValueChange?.(next)
					}}
				/>
				<button type="button" onClick={() => setValue(null)}>
					Clear
				</button>
			</Field>
		)
	},
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByTestId('due')
		await expect(trigger).toHaveTextContent('November 9th, 2026')
		await userEvent.click(canvas.getByRole('button', { name: 'Clear' }))
		await expect(trigger).toHaveTextContent('Pick a date')
		await userEvent.click(trigger)
		const popup = await openPopup()
		await userEvent.click(day(popup, '2026-11-03'))
		await waitFor(() => expect(popup).not.toBeInTheDocument())
		await expect(trigger).toHaveTextContent('November 3rd, 2026')
	},
}
