import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, waitFor, within } from 'storybook/test'

import { Button } from './button.js'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './dialog.js'
import { Toaster, toast } from './toast.js'

type ToastOptions = Parameters<typeof toast.add>[0]

/**
 * The Notifications region the toasts render in, portalled to the body. A role query skips
 * `aria-hidden` subtrees, so finding it also proves nothing has hidden it.
 */
const region = () => screen.findByRole('region', { name: 'Notifications' })

/** Waits until none of these toasts is still moving: enter, stack and expand transitions. */
const settled = (...toasts: HTMLElement[]) =>
	waitFor(() => {
		for (const t of toasts)
			expect(t.getAnimations().filter((a) => a.playState === 'running')).toEqual([])
	})

/** The type icon: the toast's first icon, before its text (the close button's X comes last). */
const typeIcon = (shown: HTMLElement) => shown.querySelector('svg')

/** Clicks the story's button and returns the toast it shows, once its enter animation is done. */
const showToast = async (
	canvas: { getByRole: (role: string, options: { name: string }) => HTMLElement },
	userEvent: { click: (el: Element) => Promise<void> },
	role: 'dialog' | 'alertdialog' = 'dialog'
) => {
	await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }))
	const shown = await within(await region()).findByRole(role, { hidden: true })
	await waitFor(() => expect(shown).not.toHaveAttribute('data-starting-style'))
	await settled(shown)
	return shown
}

/** A button that shows a toast through the `toast` manager `Toaster` listens to. */
const ShowToast = ({ options }: { options: ToastOptions }) => (
	<Button variant="outline" onClick={() => toast.add(options)}>
		Show toast
	</Button>
)

/**
 * `title` is the library component's Penpot path. A toast is shown through the `toast` manager;
 * `Toaster` renders each one as `Toast` with its title, description, action and close button.
 * `timeout: 0` keeps a toast up until it is closed, so the integration tier can read it.
 */
const meta = {
	title: 'Components/Toast',
	component: Toaster,
	args: { timeout: 0 },
	parameters: { layout: 'centered' },
	render: (args, { parameters }) => (
		<Toaster {...args}>
			<ShowToast options={parameters.toast as ToastOptions} />
		</Toaster>
	),
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A title only: a `dialog` in the Notifications region, closed by its close button. Base UI keeps
 * the close button `aria-hidden` until the stack expands on hover or the button gets focus.
 */
export const Default: Story = {
	parameters: { toast: { title: 'Event created' } },
	play: async ({ canvas, userEvent }) => {
		const shown = await showToast(canvas, userEvent)
		await expect(shown).toHaveAccessibleName('Event created')
		await expect(shown).not.toHaveAttribute('aria-hidden')
		await expect(getComputedStyle(shown).borderTopLeftRadius).toBe('14px')
		await expect(within(shown).queryByRole('button', { name: 'Undo' })).toBeNull()
		// The close button is `aria-hidden` until the stack expands (on hover) or it gets focus.
		await expect(within(shown).queryByRole('button', { name: 'Close toast' })).toBeNull()
		await userEvent.hover(shown)
		await userEvent.click(await within(shown).findByRole('button', { name: 'Close toast' }))
		await waitFor(() => expect(shown).not.toBeInTheDocument())
	},
}

export const WithDescription: Story = {
	parameters: {
		toast: { title: 'Event created', description: 'Sunday, December 3 at 9:00 AM' },
	},
	play: async ({ canvas, userEvent }) => {
		const shown = await showToast(canvas, userEvent)
		await expect(shown).toHaveAccessibleName('Event created')
		await expect(shown).toHaveAccessibleDescription('Sunday, December 3 at 9:00 AM')
	},
}

const undo = fn()

/** An action button beside the text; it runs the toast's `actionProps.onClick`. */
export const WithAction: Story = {
	parameters: {
		toast: {
			title: 'Message archived',
			description: 'It has moved to the archive.',
			actionProps: { children: 'Undo', onClick: undo },
		},
	},
	play: async ({ canvas, userEvent }) => {
		undo.mockClear()
		const shown = await showToast(canvas, userEvent)
		await userEvent.click(within(shown).getByRole('button', { name: 'Undo' }))
		await expect(undo).toHaveBeenCalledOnce()
	},
}

/** The toast's `type` picks the icon before its text. */
const typeStory = (type: string, title: string): Story => ({
	parameters: { toast: { title, type } },
	play: async ({ canvas, userEvent }) => {
		const shown = await showToast(canvas, userEvent)
		await expect(shown).toHaveAttribute('data-type', type)
		const icon = typeIcon(shown)
		await expect(icon).not.toHaveClass('lucide-x')
		// The computed width, not the box: the loading icon spins.
		await expect(getComputedStyle(icon as Element).width).toBe('16px')
	},
})

export const Success = typeStory('success', 'Changes saved')
export const Info = typeStory('info', 'A new version is available')
export const Warning = typeStory('warning', 'Your session expires soon')
export const Loading = typeStory('loading', 'Uploading')

/** An error's icon is the destructive colour. */
export const ErrorType: Story = {
	name: 'Error',
	parameters: { toast: { title: 'Upload failed', type: 'error' } },
	play: async ({ canvas, userEvent }) => {
		const shown = await showToast(canvas, userEvent)
		const icon = typeIcon(shown)
		await expect(icon).toHaveClass('text-destructive')
		await expect(getComputedStyle(icon as Element).color).not.toBe(
			getComputedStyle(shown).color
		)
	},
}

/**
 * A high-priority toast is an `alertdialog`, `aria-hidden` until it gets focus, and a separate
 * visually hidden `role="alert"` announces its text (Base UI trap 3).
 */
export const HighPriority: Story = {
	parameters: {
		toast: {
			title: 'Connection lost',
			description: 'Reconnecting…',
			priority: 'high',
		},
		// Base UI marks a high-priority toast `aria-hidden` until it gets focus while keeping it
		// focusable, and announces it through a separate `role="alert"` instead (trap 3). axe's
		// aria-hidden-focus rule flags that by design; every other rule still runs.
		a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
	},
	play: async ({ canvas, userEvent }) => {
		const shown = await showToast(canvas, userEvent, 'alertdialog')
		await expect(shown).toHaveAttribute('aria-hidden', 'true')
		await expect(await screen.findByRole('alert')).toHaveTextContent(
			'Connection lostReconnecting…'
		)
		await expect(within(await region()).queryByRole('alertdialog')).toBeNull()
	},
}

/**
 * Three toasts stack: the newest in front, the older ones scaled down and peeking above it.
 * Hovering the stack expands it into a column.
 */
export const Stacked: Story = {
	render: (args) => (
		<Toaster {...args}>
			<Button
				variant="outline"
				onClick={() => {
					toast.add({ title: 'First' })
					toast.add({ title: 'Second' })
					toast.add({ title: 'Third' })
				}}
			>
				Show toasts
			</Button>
		</Toaster>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Show toasts' }))
		const notifications = await region()
		await waitFor(() => expect(within(notifications).getAllByRole('dialog')).toHaveLength(3))
		const [third, second, first] = ['Third', 'Second', 'First'].map((name) =>
			within(notifications).getByRole('dialog', { name })
		) as [HTMLElement, HTMLElement, HTMLElement]
		await settled(first, second, third)
		const box = (t: HTMLElement) => t.getBoundingClientRect()
		// Collapsed: each older toast is narrower and its top peeks above the one in front.
		await expect(box(second).width).toBeLessThan(box(third).width)
		await expect(box(first).width).toBeLessThan(box(second).width)
		await expect(box(second).top).toBeLessThan(box(third).top)
		await expect(box(first).top).toBeLessThan(box(second).top)
		await expect(Number(getComputedStyle(third).zIndex)).toBeGreaterThan(
			Number(getComputedStyle(second).zIndex)
		)

		await userEvent.hover(third)
		await waitFor(() => expect(third).toHaveAttribute('data-expanded'))
		await settled(first, second, third)
		// Expanded: full width, one above the other with a gap between.
		await expect(box(second).width).toBe(box(third).width)
		await expect(box(second).bottom).toBeLessThan(box(third).top)
		await expect(box(first).bottom).toBeLessThan(box(second).top)
	},
}

/**
 * A toast shown while a dialog is open. Base UI marks the page under a dialog `aria-hidden`, but
 * the toast viewport is exempt, so the toast stays reachable (Base UI trap 2); it paints above
 * the dialog's backdrop, so it takes clicks too.
 */
export const InDialog: Story = {
	render: (args) => (
		<Toaster {...args}>
			<Dialog>
				<DialogTrigger render={<Button variant="outline" />}>Edit profile</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit profile</DialogTitle>
						<DialogDescription>Save to see the toast.</DialogDescription>
					</DialogHeader>
					<Button onClick={() => toast.add({ title: 'Profile saved' })}>Save</Button>
				</DialogContent>
			</Dialog>
		</Toaster>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Edit profile' }))
		const dialog = await screen.findByRole('dialog', { name: 'Edit profile' })
		await waitFor(() => expect(dialog).toBeVisible())
		await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
		const notifications = await region()
		const saved = await within(notifications).findByRole('dialog', { name: 'Profile saved' })
		await expect(saved).toBeVisible()
		await waitFor(() => expect(saved).not.toHaveAttribute('data-starting-style'))
		await settled(saved)
		// The toast paints above the dialog's backdrop, so a click on it reaches it.
		const { left, top, width, height } = saved.getBoundingClientRect()
		await expect(
			saved.contains(document.elementFromPoint(left + width / 2, top + height / 2))
		).toBe(true)
	},
}
