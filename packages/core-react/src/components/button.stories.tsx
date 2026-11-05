import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { PlusIcon } from '../icons.js'
import { Button } from './button.js'

/** One story per value of each variant property; `title` is the library component's Penpot path. */
const meta = {
	title: 'Components/Button',
	component: Button,
	args: { children: 'Button', onClick: fn() },
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button'))
		await expect(args.onClick).toHaveBeenCalledOnce()
	},
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Outline: Story = { args: { variant: 'outline' } }

export const Secondary: Story = { args: { variant: 'secondary' } }

export const Ghost: Story = { args: { variant: 'ghost' } }

export const Destructive: Story = { args: { variant: 'destructive' } }

export const Link: Story = { args: { variant: 'link' } }

export const ExtraSmall: Story = { args: { size: 'xs' } }

export const Small: Story = { args: { size: 'sm' } }

export const Large: Story = { args: { size: 'lg' } }

const icon = { children: <PlusIcon />, 'aria-label': 'Add' }

export const Icon: Story = { args: { ...icon, size: 'icon' } }

export const IconExtraSmall: Story = { args: { ...icon, size: 'icon-xs' } }

export const IconSmall: Story = { args: { ...icon, size: 'icon-sm' } }

export const IconLarge: Story = { args: { ...icon, size: 'icon-lg' } }

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('button', { name: 'Button' })).toBeDisabled()
	},
}
