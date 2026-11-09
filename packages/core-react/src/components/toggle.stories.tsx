import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, waitFor } from 'storybook/test'

import { LetterBIcon } from '../icons.js'
import { Toggle } from './toggle.js'

/** `title` is the library component's Penpot path; one story per `variant` and `size`, plus the states. */
const meta = {
	title: 'Components/Toggle',
	component: Toggle,
	args: { children: <LetterBIcon />, 'aria-label': 'Bold', onPressedChange: fn() },
	play: async ({ args, canvas, userEvent }) => {
		const toggle = canvas.getByRole('button', { name: 'Bold' })
		const resting = getComputedStyle(toggle).backgroundColor
		await expect(toggle).toHaveAttribute('aria-pressed', 'false')
		await userEvent.click(toggle)
		await expect(toggle).toHaveAttribute('aria-pressed', 'true')
		await expect(args.onPressedChange).toHaveBeenCalledOnce()
		// Pressed is `bg-muted`; move the pointer off so hover doesn't paint the same colour, and
		// wait out the background's transition.
		await userEvent.unhover(toggle)
		await waitFor(() => expect(getComputedStyle(toggle).backgroundColor).not.toBe(resting))
	},
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	play: async (context) => {
		await meta.play(context)
		const toggle = context.canvas.getByRole('button', { name: 'Bold' })
		await expect(toggle.getBoundingClientRect().height).toBe(36)
	},
}

export const Outline: Story = {
	args: { variant: 'outline' },
	play: async (context) => {
		await meta.play(context)
		const toggle = context.canvas.getByRole('button', { name: 'Bold' })
		await expect(getComputedStyle(toggle).borderTopWidth).toBe('1px')
	},
}

export const Small: Story = {
	args: { size: 'sm' },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('button', { name: 'Bold' }).getBoundingClientRect().height
		).toBe(32)
	},
}

export const Large: Story = {
	args: { size: 'lg' },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('button', { name: 'Bold' }).getBoundingClientRect().height
		).toBe(40)
	},
}

/** A label beside the icon widens the toggle past its square minimum. */
export const WithText: Story = {
	args: {
		children: (
			<>
				<LetterBIcon data-icon="inline-start" /> Bold
			</>
		),
		'aria-label': undefined,
	},
}

export const Pressed: Story = {
	args: { defaultPressed: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('button', { name: 'Bold' })).toHaveAttribute(
			'aria-pressed',
			'true'
		)
	},
}

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvas }) => {
		const toggle = canvas.getByRole('button', { name: 'Bold' })
		await expect(toggle).toBeDisabled()
		await expect(getComputedStyle(toggle).opacity).toBe('0.5')
	},
}
