import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Skeleton } from './skeleton.js'

/** `title` is the library component's Penpot path. A skeleton has no variants: its size is the caller's. */
const meta = {
	title: 'Components/Skeleton',
	component: Skeleton,
	args: { className: 'h-4 w-72', 'data-testid': 'skeleton' } as Meta<typeof Skeleton>['args'],
	play: async ({ canvas, canvasElement }) => {
		const skeleton = canvas.getByTestId('skeleton')
		const style = getComputedStyle(skeleton)
		await expect(style.animationName).toBe('pulse')
		await expect(style.backgroundColor).not.toBe(
			getComputedStyle(canvasElement).backgroundColor
		)
		await expect(skeleton.getBoundingClientRect().height).toBe(16)
	},
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The shapes a card placeholder is built from: a round avatar and two lines. */
export const Card: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Skeleton className="size-12 rounded-full" />
			<div className="flex flex-col gap-2">
				<Skeleton data-testid="skeleton" className="h-4 w-72" />
				<Skeleton className="h-4 w-36" />
			</div>
		</div>
	),
}
