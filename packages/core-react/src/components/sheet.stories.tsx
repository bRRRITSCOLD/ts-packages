import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, waitFor } from 'storybook/test'

import { Button } from './button.js'
import { Field, FieldLabel } from './field.js'
import { Input } from './input.js'
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from './sheet.js'

/** Finds an open sheet by its title and waits until its enter transition has finished. */
const openSheet = async (name: string) => {
	const sheet = await screen.findByRole('dialog', { name })
	await waitFor(() => expect(sheet).not.toHaveAttribute('data-starting-style'))
	await waitFor(() => expect(getComputedStyle(sheet).opacity).toBe('1'))
	// The fade can finish before the slide: wait for every transition on the sheet to end, or
	// the edge reads a sub-pixel offset (-3.5e-7) instead of 0.
	await waitFor(() =>
		expect(sheet.getAnimations().filter((a) => a.playState === 'running')).toEqual([])
	)
	return sheet
}

/**
 * `title` is the library component's Penpot path; one story per value of `side`. Each story
 * opens its sheet in `play` and checks the edge it is pinned to.
 */
const meta = {
	title: 'Components/Sheet',
	component: SheetContent,
	args: { side: 'right' },
	render: (args) => (
		<Sheet>
			<SheetTrigger render={<Button variant="outline" />}>Edit profile</SheetTrigger>
			<SheetContent {...args}>
				<SheetHeader>
					<SheetTitle>Edit profile</SheetTitle>
					<SheetDescription>Make changes to your profile here.</SheetDescription>
				</SheetHeader>
				<div className="px-4">
					<Field>
						<FieldLabel htmlFor="sheet-name">Name</FieldLabel>
						<Input id="sheet-name" name="name" />
					</Field>
				</div>
				<SheetFooter>
					<Button>Save changes</Button>
					<SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Edit profile' }))
		const sheet = await openSheet('Edit profile')
		const box = sheet.getBoundingClientRect()
		const edge = {
			top: box.top,
			left: box.left,
			right: window.innerWidth - box.right,
			bottom: window.innerHeight - box.bottom,
		}
		await expect(edge[args.side ?? 'right']).toBe(0)
	},
} satisfies Meta<typeof SheetContent>

export default meta
type Story = StoryObj<typeof meta>

export const Right: Story = {}

export const Left: Story = { args: { side: 'left' } }

export const Top: Story = { args: { side: 'top' } }

export const Bottom: Story = { args: { side: 'bottom' } }

/** `showCloseButton={false}` drops the corner close button; the footer's Cancel still closes. */
export const NoCloseButton: Story = {
	args: { showCloseButton: false },
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Edit profile' }))
		const sheet = await openSheet('Edit profile')
		await expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
		await waitFor(() => expect(sheet).not.toBeInTheDocument())
	},
}
