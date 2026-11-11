import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, screen, waitFor } from 'storybook/test'

import { TrashIcon } from '../icons.js'
import { Button } from './button.js'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from './dropdown-menu.js'

/** Opens the menu from its trigger and waits out the enter animation. */
const openMenu = async (
	canvas: { getByRole: typeof screen.getByRole },
	userEvent: { click: (el: Element) => Promise<void> }
) => {
	await userEvent.click(canvas.getByRole('button', { name: 'Open menu' }))
	const menu = await screen.findByRole('menu')
	await waitFor(() => expect(menu).toBeVisible())
	return menu
}

/**
 * `title` is the library component's Penpot path. `variant` belongs to `DropdownMenuItem`, so
 * the Default story shows both values; the rest show the checkbox, radio and submenu items.
 */
const meta = {
	title: 'Components/DropdownMenu',
	component: DropdownMenuItem,
	args: { onClick: fn() },
	render: (args) => (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>
				Open menu
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-72">
				<DropdownMenuGroup>
					<DropdownMenuLabel>My account</DropdownMenuLabel>
					<DropdownMenuItem {...args}>
						Profile
						<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						Settings
						<DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem disabled>Billing</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">
					<TrashIcon />
					Delete account
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
	play: async ({ args, canvas, userEvent }) => {
		const menu = await openMenu(canvas, userEvent)
		const disabled = screen.getByRole('menuitem', { name: 'Billing' })
		await expect(disabled).toHaveAttribute('data-disabled')
		await expect(getComputedStyle(disabled).opacity).toBe('0.5')
		const destructive = screen.getByRole('menuitem', { name: 'Delete account' })
		const profile = screen.getByRole('menuitem', { name: /Profile/ })
		await expect(getComputedStyle(destructive).color).not.toBe(getComputedStyle(profile).color)
		await userEvent.hover(profile)
		await waitFor(() => expect(profile).toHaveAttribute('data-highlighted'))
		const settings = screen.getByRole('menuitem', { name: /Settings/ })
		await expect(getComputedStyle(profile).backgroundColor).not.toBe(
			getComputedStyle(settings).backgroundColor
		)
		await userEvent.click(profile)
		await expect(args.onClick).toHaveBeenCalledOnce()
		await waitFor(() => expect(menu).not.toBeInTheDocument())
	},
} satisfies Meta<typeof DropdownMenuItem>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** A checkbox item toggles its check without closing the menu. */
export const Checkboxes: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>
				Open menu
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-72">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Appearance</DropdownMenuLabel>
					<DropdownMenuCheckboxItem defaultChecked closeOnClick={false}>
						Status bar
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem closeOnClick={false}>
						Activity bar
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	),
	play: async ({ canvas, userEvent }) => {
		await openMenu(canvas, userEvent)
		const activity = screen.getByRole('menuitemcheckbox', { name: 'Activity bar' })
		await expect(activity).toHaveAttribute('aria-checked', 'false')
		await userEvent.click(activity)
		await expect(activity).toHaveAttribute('aria-checked', 'true')
		await expect(screen.getByRole('menu')).toBeVisible()
	},
}

/** A radio group checks one item at a time. */
export const RadioItems: Story = {
	render: function Render() {
		const [position, setPosition] = useState('bottom')
		return (
			<DropdownMenu>
				<DropdownMenuTrigger render={<Button variant="outline" />}>
					Open menu
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-72">
					<DropdownMenuGroup>
						<DropdownMenuLabel>Panel position</DropdownMenuLabel>
						<DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
							<DropdownMenuRadioItem value="top" closeOnClick={false}>
								Top
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="bottom" closeOnClick={false}>
								Bottom
							</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		)
	},
	play: async ({ canvas, userEvent }) => {
		await openMenu(canvas, userEvent)
		const top = screen.getByRole('menuitemradio', { name: 'Top' })
		const bottom = screen.getByRole('menuitemradio', { name: 'Bottom' })
		await expect(bottom).toHaveAttribute('aria-checked', 'true')
		await userEvent.click(top)
		await expect(top).toHaveAttribute('aria-checked', 'true')
		await expect(bottom).toHaveAttribute('aria-checked', 'false')
	},
}

/** A submenu opens beside its trigger, which stays highlighted while it is open. */
export const Submenu: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>
				Open menu
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-72">
				<DropdownMenuItem>New file</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem>Email</DropdownMenuItem>
						<DropdownMenuItem>Message</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	),
	play: async ({ canvas, userEvent }) => {
		await openMenu(canvas, userEvent)
		const share = screen.getByRole('menuitem', { name: 'Share' })
		await userEvent.click(share)
		const email = await screen.findByRole('menuitem', { name: 'Email' })
		await waitFor(() => expect(email).toBeVisible())
		await expect(share).toHaveAttribute('data-popup-open')
		const newFile = screen.getByRole('menuitem', { name: 'New file' })
		await expect(getComputedStyle(share).backgroundColor).not.toBe(
			getComputedStyle(newFile).backgroundColor
		)
		await expect(email.getBoundingClientRect().left).toBeGreaterThanOrEqual(
			share.getBoundingClientRect().right
		)
	},
}
