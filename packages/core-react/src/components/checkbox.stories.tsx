import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { Checkbox } from './checkbox.js'

/** `title` is the library component's Penpot path. Checkbox has no variants: one story per state. */
const meta = {
	title: 'Components/Checkbox',
	component: Checkbox,
	args: { 'aria-label': 'Accept terms', onCheckedChange: fn() },
	play: async ({ args, canvas, userEvent }) => {
		const checkbox = canvas.getByRole('checkbox', { name: 'Accept terms' })
		const before = checkbox.getAttribute('aria-checked') === 'true'
		await userEvent.click(checkbox)
		await expect(checkbox).toHaveAttribute('aria-checked', String(!before))
		await expect(args.onCheckedChange).toHaveBeenCalledOnce()
	},
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = { args: { defaultChecked: true } }

export const Invalid: Story = { args: { 'aria-invalid': true } }

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ args, canvas, userEvent }) => {
		const checkbox = canvas.getByRole('checkbox', { name: 'Accept terms' })
		await expect(checkbox).toHaveAttribute('aria-disabled', 'true')
		await expect(getComputedStyle(checkbox).opacity).toBe('0.5')
		await userEvent.click(checkbox)
		await expect(args.onCheckedChange).not.toHaveBeenCalled()
	},
}
