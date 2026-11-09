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
import { Input } from './input.js'
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from './popover.js'

/** Finds an open popover by its title and waits out the enter animation. */
const openPopover = async (name: string) => {
	const popover = await screen.findByRole('dialog', { name })
	await waitFor(() => expect(popover).toBeVisible())
	return popover
}

/** The popover every story opens; `args` go to its content. */
const DimensionsPopover = (args: ComponentProps<typeof PopoverContent>) => (
	<Popover>
		<PopoverTrigger render={<Button variant="outline" />}>Dimensions</PopoverTrigger>
		<PopoverContent {...args}>
			<PopoverHeader>
				<PopoverTitle>Dimensions</PopoverTitle>
				<PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
			</PopoverHeader>
			<Field orientation="horizontal">
				<FieldLabel htmlFor={`width-${args.side ?? 'bottom'}`}>Width</FieldLabel>
				<Input id={`width-${args.side ?? 'bottom'}`} defaultValue="100%" />
			</Field>
		</PopoverContent>
	</Popover>
)

/**
 * `title` is the library component's Penpot path. Each story opens its popover in `play`; the
 * integration tier drives the same stories through the `popover()` component object.
 */
const meta = {
	title: 'Components/Popover',
	component: PopoverContent,
	render: (args) => (
		<div className="flex h-screen items-center justify-center">
			<DimensionsPopover {...args} />
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole('button', { name: 'Dimensions' })
		await userEvent.click(trigger)
		const popover = await openPopover('Dimensions')
		await expect(trigger).toHaveAttribute('aria-expanded', 'true')
		await expect(getComputedStyle(popover).width).toBe('288px')
	},
} satisfies Meta<typeof PopoverContent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The popup sits on the side it is given, and says so in `data-side`. */
export const Top: Story = {
	args: { side: 'top' },
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole('button', { name: 'Dimensions' })
		await userEvent.click(trigger)
		const popover = await openPopover('Dimensions')
		await expect(popover).toHaveAttribute('data-side', 'top')
		await expect(popover.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			trigger.getBoundingClientRect().top
		)
	},
}

/**
 * A popover opened from inside a dialog. Escape closes only the popover, the top layer, and
 * leaves the dialog open (Base UI trap 1); the integration tier proves it.
 */
export const InDialog: Story = {
	render: (args) => (
		<Dialog>
			<DialogTrigger render={<Button variant="outline" />}>Edit layer</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit layer</DialogTitle>
					<DialogDescription>Change the layer's size.</DialogDescription>
				</DialogHeader>
				<DimensionsPopover {...args} />
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Edit layer' }))
		await userEvent.click(await screen.findByRole('button', { name: 'Dimensions' }))
		await openPopover('Dimensions')
	},
}
