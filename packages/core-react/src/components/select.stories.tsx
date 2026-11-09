import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ComponentProps } from 'react'
import { expect, screen, waitFor } from 'storybook/test'

import { Button } from './button.js'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './dialog.js'
import { Field, FieldLabel } from './field.js'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from './select.js'

const FRUITS = [
	{ value: 'apple', label: 'Apple' },
	{ value: 'banana', label: 'Banana' },
	{ value: 'blueberry', label: 'Blueberry' },
	{ value: 'grapes', label: 'Grapes', disabled: true },
]
const VEGETABLES = [
	{ value: 'carrot', label: 'Carrot' },
	{ value: 'leek', label: 'Leek' },
]
const ITEMS = [...FRUITS, ...VEGETABLES]

/** Opens the select from its trigger and waits out the enter animation. */
const openSelect = async (
	trigger: HTMLElement,
	userEvent: { click: (el: Element) => Promise<void> }
) => {
	await userEvent.click(trigger)
	const listbox = await screen.findByRole('listbox')
	await waitFor(() => expect(listbox).toBeVisible())
	return listbox
}

/** The select every story renders; `args` go to its trigger. */
const ProduceSelect = ({ id = 'produce', ...args }: ComponentProps<typeof SelectTrigger>) => (
	<Field>
		<FieldLabel htmlFor={id}>Produce</FieldLabel>
		<Select items={ITEMS}>
			<SelectTrigger id={id} {...args}>
				<SelectValue placeholder="Pick one" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Fruits</SelectLabel>
					{FRUITS.map((item) => (
						<SelectItem key={item.value} value={item.value} disabled={item.disabled}>
							{item.label}
						</SelectItem>
					))}
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Vegetables</SelectLabel>
					{VEGETABLES.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	</Field>
)

/**
 * `title` is the library component's Penpot path. `size` belongs to `SelectTrigger`, so the
 * stories are its values and states; the integration tier drives them through `select()`.
 */
const meta = {
	title: 'Components/Select',
	component: SelectTrigger,
	render: (args) => (
		<div className="flex h-screen items-start justify-center p-8">
			<ProduceSelect {...args} />
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole('combobox', { name: 'Produce' })
		await expect(trigger).toHaveTextContent('Pick one')
		await expect(trigger).toHaveAttribute('data-placeholder')
		await expect(trigger.getBoundingClientRect().height).toBe(36)
		await openSelect(trigger, userEvent)
		const grapes = screen.getByRole('option', { name: 'Grapes' })
		await expect(grapes).toHaveAttribute('data-disabled')
		await expect(getComputedStyle(grapes).opacity).toBe('0.5')
		const banana = screen.getByRole('option', { name: 'Banana' })
		await userEvent.hover(banana)
		await waitFor(() => expect(banana).toHaveAttribute('data-highlighted'))
		await expect(getComputedStyle(banana).backgroundColor).not.toBe(
			getComputedStyle(screen.getByRole('option', { name: 'Apple' })).backgroundColor
		)
		await userEvent.click(banana)
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
		await expect(trigger).toHaveTextContent('Banana')
		await expect(trigger).not.toHaveAttribute('data-placeholder')
	},
} satisfies Meta<typeof SelectTrigger>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = {
	args: { size: 'sm' },
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole('combobox', { name: 'Produce' })
		await expect(trigger).toHaveAttribute('data-size', 'sm')
		await expect(trigger.getBoundingClientRect().height).toBe(32)
	},
}

/** A disabled trigger fades. */
export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole('combobox', { name: 'Produce' })
		await expect(trigger).toHaveAttribute('data-disabled')
		await expect(getComputedStyle(trigger).opacity).toBe('0.5')
	},
}

/** An invalid trigger draws a different (destructive) border from a valid one. */
export const Invalid: Story = {
	args: { 'aria-invalid': true },
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole('combobox', { name: 'Produce' })
		// `transition-all` would animate the border between the two reads.
		trigger.style.transition = 'none'
		const invalid = getComputedStyle(trigger).borderColor
		trigger.removeAttribute('aria-invalid')
		const valid = getComputedStyle(trigger).borderColor
		trigger.setAttribute('aria-invalid', 'true')
		await expect(invalid).not.toBe(valid)
	},
}

/**
 * A select opened from inside a dialog. Its popup puts a backdrop over the dialog, so Escape or a
 * click outside the popup closes only the select (Base UI trap 1); the integration tier proves it.
 */
export const InDialog: Story = {
	render: (args) => (
		<Dialog>
			<DialogTrigger render={<Button variant="outline" />}>Edit order</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit order</DialogTitle>
					<DialogDescription>Change what goes in the box.</DialogDescription>
				</DialogHeader>
				<ProduceSelect id="produce-in-dialog" {...args} />
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Edit order' }))
		const dialog = await screen.findByRole('dialog', { name: 'Edit order' })
		await waitFor(() => expect(dialog).toBeVisible())
		await openSelect(screen.getByRole('combobox', { name: 'Produce' }), userEvent)
	},
}
