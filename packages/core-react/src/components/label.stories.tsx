import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Input } from './input.js'
import { Label } from './label.js'

/** `title` is the library component's Penpot path. A label names its control and focuses it on click. */
const meta = {
	title: 'Components/Label',
	component: Label,
	args: { children: 'Email', htmlFor: 'label-story-email' },
	render: (args) => (
		<div className="flex flex-col gap-2">
			<Label {...args} />
			<Input id="label-story-email" />
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByText('Email'))
		await expect(canvas.getByRole('textbox', { name: 'Email' })).toHaveFocus()
	},
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
