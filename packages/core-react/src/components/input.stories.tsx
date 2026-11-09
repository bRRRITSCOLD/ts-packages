import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Input } from './input.js'

/** `title` is the library component's Penpot path. Input has no variants: one story per state. */
const meta = {
	title: 'Components/Input',
	component: Input,
	args: { 'aria-label': 'Email', placeholder: 'you@example.com' },
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByRole('textbox', { name: 'Email' })
		await userEvent.type(input, 'ada@example.com')
		await expect(input).toHaveValue('ada@example.com')
	},
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Invalid: Story = {
	args: { 'aria-invalid': true },
}

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('textbox', { name: 'Email' })).toBeDisabled()
	},
}
