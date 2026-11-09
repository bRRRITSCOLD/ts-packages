import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, waitFor } from 'storybook/test'

import { PlusIcon } from '../icons.js'
import { Button } from './button.js'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip.js'

/**
 * `title` is the library component's Penpot path; one story per side. Each story hovers the
 * trigger in `play` and checks the tooltip names it and sits on its side.
 */
const meta = {
	title: 'Components/Tooltip',
	component: TooltipContent,
	args: { side: 'top' },
	render: (args) => (
		<div className="flex h-screen items-center justify-center">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger
						render={<Button variant="outline" size="icon" aria-label="Add" />}
					>
						<PlusIcon />
					</TooltipTrigger>
					<TooltipContent {...args}>Add to library</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	),
	play: async ({ args, canvas, userEvent }) => {
		const trigger = canvas.getByRole('button', { name: 'Add' })
		await userEvent.hover(trigger)
		const tooltip = await screen.findByText('Add to library')
		await waitFor(() => expect(tooltip).toBeVisible())
		await expect(tooltip).toHaveAttribute('data-side', args.side ?? 'top')
		const a = trigger.getBoundingClientRect()
		const b = tooltip.getBoundingClientRect()
		const gap = {
			top: a.top - b.bottom,
			bottom: b.top - a.bottom,
			left: a.left - b.right,
			right: b.left - a.right,
		}
		await expect(gap[(args.side ?? 'top') as keyof typeof gap]).toBeGreaterThan(0)
		await userEvent.unhover(trigger)
		await waitFor(() => expect(screen.queryByText('Add to library')).toBeNull())
	},
} satisfies Meta<typeof TooltipContent>

export default meta
type Story = StoryObj<typeof meta>

export const Top: Story = {}

export const Right: Story = { args: { side: 'right' } }

export const Bottom: Story = { args: { side: 'bottom' } }

export const Left: Story = { args: { side: 'left' } }
