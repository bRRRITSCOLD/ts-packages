import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, waitFor } from 'storybook/test'

import { TrashIcon } from '../icons.js'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
	AlertDialogTrigger,
} from './alert-dialog.js'
import { Button } from './button.js'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './dialog.js'

/** Finds an open alert dialog by its title and waits out the enter animation. */
const openAlertDialog = async (name: string) => {
	const dialog = await screen.findByRole('alertdialog', { name })
	await waitFor(() => expect(dialog).toBeVisible())
	return dialog
}

/** `title` is the library component's Penpot path; one story per value of `size`. */
const meta = {
	title: 'Components/AlertDialog',
	component: AlertDialogContent,
	args: { size: 'default' },
	render: (args) => (
		<AlertDialog>
			<AlertDialogTrigger render={<Button variant="outline" />}>
				Delete account
			</AlertDialogTrigger>
			<AlertDialogContent {...args}>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete your account?</AlertDialogTitle>
					<AlertDialogDescription>
						This deletes your account and its data, and cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive">Delete</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Delete account' }))
		await openAlertDialog('Delete your account?')
		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
	},
} satisfies Meta<typeof AlertDialogContent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = { args: { size: 'sm' } }

/** `AlertDialogMedia` holds an icon beside the title and description. */
export const WithMedia: Story = {
	render: (args) => (
		<AlertDialog>
			<AlertDialogTrigger render={<Button variant="outline" />}>
				Delete account
			</AlertDialogTrigger>
			<AlertDialogContent {...args}>
				<AlertDialogHeader>
					<AlertDialogMedia>
						<TrashIcon />
					</AlertDialogMedia>
					<AlertDialogTitle>Delete your account?</AlertDialogTitle>
					<AlertDialogDescription>
						This deletes your account and its data, and cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive">Delete</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	),
}

/**
 * An alert dialog opened from inside a dialog: Escape closes only the alert dialog, the top
 * layer, and leaves the dialog open (Base UI trap 1).
 */
export const InDialog: Story = {
	render: (args) => (
		<Dialog>
			<DialogTrigger render={<Button variant="outline" />}>Edit profile</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit profile</DialogTitle>
					<DialogDescription>Make changes to your profile here.</DialogDescription>
				</DialogHeader>
				<DialogFooter>{meta.render(args)}</DialogFooter>
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Edit profile' }))
		await userEvent.click(await screen.findByRole('button', { name: 'Delete account' }))
		await openAlertDialog('Delete your account?')
	},
}
