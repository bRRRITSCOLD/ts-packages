import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Textarea } from './textarea.js'

/** `title` is the library component's Penpot path. Textarea has no variants: one story per state. */
const meta = {
	title: 'Components/Textarea',
	component: Textarea,
	args: { 'aria-label': 'Message', placeholder: 'Type your message here.' },
	play: async ({ canvas, userEvent }) => {
		const textarea = canvas.getByRole('textbox', { name: 'Message' })
		await userEvent.type(textarea, 'Hello{enter}world')
		await expect(textarea).toHaveValue('Hello\nworld')
	},
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Invalid: Story = {
	args: { 'aria-invalid': true },
}

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('textbox', { name: 'Message' })).toBeDisabled()
	},
}
