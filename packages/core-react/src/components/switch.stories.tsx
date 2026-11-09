import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { Switch } from './switch.js'

/** `title` is the library component's Penpot path; one story per `size`, plus the states. */
const meta = {
	title: 'Components/Switch',
	component: Switch,
	args: { 'aria-label': 'Airplane mode', onCheckedChange: fn() },
	play: async ({ args, canvas, userEvent }) => {
		const control = canvas.getByRole('switch', { name: 'Airplane mode' })
		const before = control.getAttribute('aria-checked') === 'true'
		await userEvent.click(control)
		await expect(control).toHaveAttribute('aria-checked', String(!before))
		await expect(args.onCheckedChange).toHaveBeenCalledOnce()
	},
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = { args: { size: 'sm' } }

export const Checked: Story = { args: { defaultChecked: true } }

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ args, canvas, userEvent }) => {
		const control = canvas.getByRole('switch', { name: 'Airplane mode' })
		await expect(control).toHaveAttribute('aria-disabled', 'true')
		await expect(getComputedStyle(control).opacity).toBe('0.5')
		await userEvent.click(control)
		await expect(args.onCheckedChange).not.toHaveBeenCalled()
	},
}
