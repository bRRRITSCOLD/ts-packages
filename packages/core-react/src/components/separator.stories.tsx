import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Separator } from './separator.js'

/** `title` is the library component's Penpot path; one story per `orientation`. */
const meta = {
	title: 'Components/Separator',
	component: Separator,
	render: (args) => (
		<div className="flex h-10 w-64 items-center justify-center">
			<Separator {...args} />
		</div>
	),
	play: async ({ args, canvas }) => {
		const separator = canvas.getByRole('separator')
		const vertical = args.orientation === 'vertical'
		await expect(separator).toHaveAttribute(
			'aria-orientation',
			vertical ? 'vertical' : 'horizontal'
		)
		// A hairline across the box: an orientation class that never matches leaves it 0px.
		const { width, height } = separator.getBoundingClientRect()
		await expect(vertical ? width : height).toBe(1)
		await expect(vertical ? height : width).toBeGreaterThan(1)
	},
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {}

export const Vertical: Story = { args: { orientation: 'vertical' } }
