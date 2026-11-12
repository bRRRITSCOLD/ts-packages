import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { BadgeCheckIcon } from '../icons.js'
import { Badge } from './badge.js'

/** `title` is the library component's Penpot path; one story per `variant`. */
const meta = {
	title: 'Components/Badge',
	component: Badge,
	args: { children: 'Badge' },
	play: async ({ canvas }) => {
		const badge = canvas.getByText('Badge')
		await expect(badge).toHaveAttribute('data-slot', 'badge')
		await expect(badge.getBoundingClientRect().height).toBe(20)
		await expect(getComputedStyle(badge).borderTopLeftRadius).toBe('9999px')
	},
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Secondary: Story = { args: { variant: 'secondary' } }

export const Destructive: Story = { args: { variant: 'destructive' } }

/**
 * The status variants tint their text's colour behind it, as `destructive` does: `text-<status>`
 * on `bg-<status>-background`. The play reads both off the tokens, so it holds in either mode.
 */
const readsStatusTokens =
	(status: 'success' | 'warning' | 'info'): Story['play'] =>
	async (context) => {
		await meta.play(context)
		const badge = context.canvas.getByText('Badge')
		// The tokens' resolved values, written onto a probe so the browser serialises them as it
		// serialises the badge's computed colours.
		const theme = getComputedStyle(context.canvasElement)
		const probe = document.createElement('span')
		probe.style.color = theme.getPropertyValue(`--${status}`)
		probe.style.backgroundColor = theme.getPropertyValue(`--${status}-background`)
		context.canvasElement.append(probe)
		await expect(getComputedStyle(badge).color).toBe(getComputedStyle(probe).color)
		await expect(getComputedStyle(badge).backgroundColor).toBe(
			getComputedStyle(probe).backgroundColor
		)
		probe.remove()
	}

export const Success: Story = {
	args: { variant: 'success' },
	play: readsStatusTokens('success'),
}

export const Warning: Story = {
	args: { variant: 'warning' },
	play: readsStatusTokens('warning'),
}

export const Info: Story = {
	args: { variant: 'info' },
	play: readsStatusTokens('info'),
}

export const Outline: Story = { args: { variant: 'outline' } }

export const Ghost: Story = { args: { variant: 'ghost' } }

export const Link: Story = { args: { variant: 'link' } }

/** An icon is held at `size-3` (12px). */
export const WithIcon: Story = {
	args: {
		children: (
			<>
				<BadgeCheckIcon data-icon="inline-start" />
				Badge
			</>
		),
	},
	play: async ({ canvas }) => {
		const badge = canvas.getByText('Badge')
		await expect(badge.querySelector('svg')?.getBoundingClientRect().width).toBe(12)
	},
}

/** `render` swaps the `<span>` for a link, which keeps the badge's look. */
export const AsLink: Story = {
	args: { render: <a href="#badge">Badge</a> },
	play: async ({ canvas }) => {
		const link = canvas.getByRole('link', { name: 'Badge' })
		await expect(link).toHaveAttribute('data-slot', 'badge')
		await expect(link.getBoundingClientRect().height).toBe(20)
	},
}
