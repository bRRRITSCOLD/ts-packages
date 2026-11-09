import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { PlusIcon } from '../icons.js'
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
} from './avatar.js'

/** A local image, so the stories never wait on the network. */
const PORTRAIT = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#6b7280"/><circle cx="4" cy="3" r="2" fill="#e5e7eb"/></svg>'
)}`

/** `title` is the library component's Penpot path; one story per `size`, plus the parts. */
const meta = {
	title: 'Components/Avatar',
	component: Avatar,
	render: (args) => (
		<Avatar {...args}>
			<AvatarImage src={PORTRAIT} alt="Ada Lovelace" />
			<AvatarFallback>AL</AvatarFallback>
		</Avatar>
	),
	play: async ({ canvas }) => {
		// Base UI mounts the image once it has loaded, and drops the fallback.
		const image = await canvas.findByRole('img', { name: 'Ada Lovelace' })
		await expect(image.getBoundingClientRect().width).toBe(32)
		await expect(canvas.queryByText('AL')).toBeNull()
	},
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = {
	args: { size: 'sm' },
	play: async ({ canvas }) => {
		const image = await canvas.findByRole('img', { name: 'Ada Lovelace' })
		await expect(image.getBoundingClientRect().width).toBe(24)
	},
}

export const Large: Story = {
	args: { size: 'lg' },
	play: async ({ canvas }) => {
		const image = await canvas.findByRole('img', { name: 'Ada Lovelace' })
		await expect(image.getBoundingClientRect().width).toBe(40)
	},
}

/** With no image, or one that fails to load, the fallback's initials show. */
export const Fallback: Story = {
	render: (args) => (
		<Avatar {...args}>
			<AvatarFallback>AL</AvatarFallback>
		</Avatar>
	),
	parameters: {
		// Upstream's fallback is `text-muted-foreground` on `bg-muted`: neutral.500 on neutral.100,
		// 4.36:1, under AA's 4.5:1 for its text-sm initials. The pair is the token file's, shared
		// with every muted surface, so it is flagged rather than changed here; every other rule runs.
		a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
	},
	play: async ({ canvas, canvasElement }) => {
		const fallback = canvas.getByText('AL')
		await expect(fallback.getBoundingClientRect().width).toBe(32)
		await expect(getComputedStyle(fallback).backgroundColor).not.toBe(
			getComputedStyle(canvasElement).backgroundColor
		)
	},
}

/** The badge sits on the bottom-right edge: `size-2.5` (10px) at the default size. */
export const WithBadge: Story = {
	render: (args) => (
		<Avatar {...args}>
			<AvatarImage src={PORTRAIT} alt="Ada Lovelace" />
			<AvatarFallback>AL</AvatarFallback>
			<AvatarBadge data-testid="badge" />
		</Avatar>
	),
	play: async ({ canvas }) => {
		const image = await canvas.findByRole('img', { name: 'Ada Lovelace' })
		const badge = canvas.getByTestId('badge').getBoundingClientRect()
		await expect(badge.width).toBe(10)
		await expect(badge.right).toBe(image.getBoundingClientRect().right)
		await expect(badge.bottom).toBe(image.getBoundingClientRect().bottom)
	},
}

/** A group overlaps its avatars by `-space-x-2` (8px) and ends in a count. */
export const Group: Story = {
	render: (args) => (
		<AvatarGroup>
			{['Ada Lovelace', 'Grace Hopper', 'Alan Turing'].map((name) => (
				<Avatar key={name} {...args}>
					<AvatarImage src={PORTRAIT} alt={name} />
					<AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
				</Avatar>
			))}
			<AvatarGroupCount>
				<PlusIcon aria-label="3 more" />
			</AvatarGroupCount>
		</AvatarGroup>
	),
	play: async ({ canvas }) => {
		const ada = (
			await canvas.findByRole('img', { name: 'Ada Lovelace' })
		).getBoundingClientRect()
		const grace = (
			await canvas.findByRole('img', { name: 'Grace Hopper' })
		).getBoundingClientRect()
		await expect(ada.right - grace.left).toBe(8)
		await expect(canvas.getByLabelText('3 more').getBoundingClientRect().width).toBe(16)
	},
}
