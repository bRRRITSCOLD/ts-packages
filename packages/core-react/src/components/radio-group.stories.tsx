import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { Label } from './label.js'
import { RadioGroup, RadioGroupItem } from './radio-group.js'

const PLANS = ['Starter', 'Pro', 'Enterprise']

/** `title` is the library component's Penpot path. Each item is a `RadioGroupItem` beside a `Label`. */
const meta = {
	title: 'Components/RadioGroup',
	component: RadioGroup,
	args: { 'aria-label': 'Plan', defaultValue: 'Starter', onValueChange: fn() },
	render: (args) => (
		<RadioGroup {...args}>
			{PLANS.map((plan) => (
				<Label key={plan}>
					<RadioGroupItem value={plan} />
					{plan}
				</Label>
			))}
		</RadioGroup>
	),
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('radio', { name: 'Pro' }))
		await expect(canvas.getByRole('radio', { name: 'Pro' })).toBeChecked()
		await expect(canvas.getByRole('radio', { name: 'Starter' })).not.toBeChecked()
		await expect(args.onValueChange).toHaveBeenCalledOnce()
	},
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ args, canvas, userEvent }) => {
		for (const radio of canvas.getAllByRole('radio'))
			await expect(getComputedStyle(radio).opacity).toBe('0.5')
		await userEvent.click(canvas.getByRole('radio', { name: 'Pro' }))
		await expect(canvas.getByRole('radio', { name: 'Starter' })).toBeChecked()
		await expect(args.onValueChange).not.toHaveBeenCalled()
	},
}
