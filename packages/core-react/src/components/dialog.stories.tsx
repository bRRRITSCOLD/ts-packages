import type { Meta, StoryObj } from '@storybook/react-vite'
import { useId } from 'react'
import { expect, screen, waitFor } from 'storybook/test'

import { Button } from './button.js'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './dialog.js'
import { Field, FieldLabel } from './field.js'
import { Input } from './input.js'

/** Finds an open dialog by its title and waits out the enter animation, which starts at opacity 0. */
const openDialog = async (name: string) => {
	const dialog = await screen.findByRole('dialog', { name })
	await waitFor(() => expect(dialog).toBeVisible())
	return dialog
}

/** A labelled name input. `useId` keeps the id unique when a nested dialog renders a second one. */
const NameField = () => {
	const id = useId()
	return (
		<Field>
			<FieldLabel htmlFor={id}>Name</FieldLabel>
			<Input id={id} name="name" />
		</Field>
	)
}

/**
 * `title` is the library component's Penpot path. Each story opens its dialog in `play`; the
 * integration tier drives the same stories through the `dialog()` component object.
 */
const meta = {
	title: 'Components/Dialog',
	component: DialogContent,
	args: { showCloseButton: true },
	render: (args) => (
		<Dialog>
			<DialogTrigger render={<Button variant="outline" />}>Edit profile</DialogTrigger>
			<DialogContent {...args}>
				<DialogHeader>
					<DialogTitle>Edit profile</DialogTitle>
					<DialogDescription>Make changes to your profile here.</DialogDescription>
				</DialogHeader>
				<NameField />
				<DialogFooter>
					<DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
					<Button>Save changes</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Edit profile' }))
		await openDialog('Edit profile')
	},
} satisfies Meta<typeof DialogContent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutCloseButton: Story = {
	args: { showCloseButton: false },
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Edit profile' }))
		await openDialog('Edit profile')
		await expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
	},
}

/** `DialogFooter`'s own close button, for a dialog that only informs. */
export const FooterCloseButton: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger render={<Button variant="outline" />}>Show terms</DialogTrigger>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Terms</DialogTitle>
					<DialogDescription>Nothing here needs an answer.</DialogDescription>
				</DialogHeader>
				<DialogFooter showCloseButton />
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Show terms' }))
		await userEvent.click(await screen.findByRole('button', { name: 'Close' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	},
}

/** A dialog opened from inside another: Escape closes only the top one (Base UI trap 1). */
export const Nested: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger render={<Button variant="outline" />}>Edit profile</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit profile</DialogTitle>
					<DialogDescription>Make changes to your profile here.</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Dialog>
						<DialogTrigger render={<Button variant="outline" />}>
							Change avatar
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Change avatar</DialogTitle>
								<DialogDescription>Pick a new picture.</DialogDescription>
							</DialogHeader>
						</DialogContent>
					</Dialog>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Edit profile' }))
		await userEvent.click(await screen.findByRole('button', { name: 'Change avatar' }))
		await openDialog('Change avatar')
	},
}

/**
 * A page holding twins of the dialog's field and button: Base UI marks the page `aria-hidden`,
 * not `inert`, so only a lookup scoped to the dialog is sure to hit the dialog's own (Base UI
 * trap 2).
 */
export const OverMatchingPage: Story = {
	render: (args) => (
		<div className="flex flex-col items-start gap-4">
			<NameField />
			<Button variant="secondary">Save changes</Button>
			{meta.render(args)}
		</div>
	),
}

/**
 * `data-testid` reaches the part it is placed on. Root renders no DOM, so a testid on `Dialog`
 * reaches nothing: put it on `DialogTrigger` or `DialogContent` (Base UI trap 7).
 */
export const TestIds: Story = {
	render: () => (
		<Dialog data-testid="profile__dialog__root">
			<DialogTrigger
				data-testid="profile__dialog__trigger"
				render={<Button variant="outline" />}
			>
				Edit profile
			</DialogTrigger>
			<DialogContent data-testid="profile__dialog__content">
				<DialogHeader>
					<DialogTitle>Edit profile</DialogTitle>
					<DialogDescription>Make changes to your profile here.</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	),
}
