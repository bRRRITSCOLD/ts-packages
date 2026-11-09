import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, waitFor } from 'storybook/test'

import { TextAlignCenterIcon, TextAlignEndIcon, TextAlignStartIcon } from '../icons.js'
import { ToggleGroup, ToggleGroupItem } from './toggle-group.js'

const ALIGNMENTS = [
	{ value: 'left', label: 'Align left', Icon: TextAlignStartIcon },
	{ value: 'center', label: 'Align center', Icon: TextAlignCenterIcon },
	{ value: 'right', label: 'Align right', Icon: TextAlignEndIcon },
]

/**
 * `title` is the library component's Penpot path; one story per `variant`, `size`, `spacing` and
 * orientation. The group's `variant` and `size` reach every item. Items are toggle buttons
 * (`aria-pressed`), one tab stop for the group, arrow keys between them.
 */
const meta = {
	title: 'Components/ToggleGroup',
	component: ToggleGroup,
	args: { 'aria-label': 'Text alignment', onValueChange: fn() },
	render: (args) => (
		<ToggleGroup {...args}>
			{ALIGNMENTS.map(({ value, label, Icon }) => (
				<ToggleGroupItem key={value} value={value} aria-label={label}>
					<Icon />
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	),
	play: async ({ args, canvas, userEvent }) => {
		const left = canvas.getByRole('button', { name: 'Align left' })
		const center = canvas.getByRole('button', { name: 'Align center' })
		const resting = getComputedStyle(center).backgroundColor
		await userEvent.click(left)
		await userEvent.click(center)
		await expect(center).toHaveAttribute('aria-pressed', 'true')
		await expect(left).toHaveAttribute('aria-pressed', 'false')
		await expect(args.onValueChange).toHaveBeenLastCalledWith(['center'], expect.anything())
		await userEvent.unhover(center)
		await waitFor(() => expect(getComputedStyle(center).backgroundColor).not.toBe(resting))
	},
} satisfies Meta<typeof ToggleGroup>

export default meta
type Story = StoryObj<typeof meta>

/** Items sit `spacing` 2 (8px) apart, each with its own corners. */
export const Default: Story = {
	play: async (context) => {
		await meta.play(context)
		const left = context.canvas
			.getByRole('button', { name: 'Align left' })
			.getBoundingClientRect()
		const center = context.canvas
			.getByRole('button', { name: 'Align center' })
			.getBoundingClientRect()
		await expect(center.left - left.right).toBe(8)
	},
}

export const Outline: Story = {
	args: { variant: 'outline' },
	play: async (context) => {
		await meta.play(context)
		const right = context.canvas.getByRole('button', { name: 'Align right' })
		await expect(getComputedStyle(right).borderTopWidth).toBe('1px')
	},
}

export const Small: Story = {
	args: { size: 'sm' },
	play: async ({ canvas }) => {
		for (const button of canvas.getAllByRole('button'))
			await expect(button.getBoundingClientRect().height).toBe(32)
	},
}

export const Large: Story = {
	args: { size: 'lg' },
	play: async ({ canvas }) => {
		for (const button of canvas.getAllByRole('button'))
			await expect(button.getBoundingClientRect().height).toBe(40)
	},
}

/** `spacing` 0 joins the items: no gap, square inner corners, shared outline borders. */
export const Joined: Story = {
	args: { variant: 'outline', spacing: 0 },
	play: async (context) => {
		await meta.play(context)
		const [left, center, right] = context.canvas.getAllByRole('button') as HTMLElement[]
		await expect(center.getBoundingClientRect().left).toBe(left.getBoundingClientRect().right)
		await expect(getComputedStyle(left).borderTopLeftRadius).toBe('8px')
		await expect(getComputedStyle(left).borderTopRightRadius).toBe('0px')
		await expect(getComputedStyle(center).borderTopLeftRadius).toBe('0px')
		await expect(getComputedStyle(center).borderLeftWidth).toBe('0px')
		await expect(getComputedStyle(right).borderTopRightRadius).toBe('8px')
	},
}

/** `multiple` lets several items stay pressed. */
export const Multiple: Story = {
	args: { multiple: true },
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Align left' }))
		await userEvent.click(canvas.getByRole('button', { name: 'Align right' }))
		await expect(args.onValueChange).toHaveBeenLastCalledWith(
			['left', 'right'],
			expect.anything()
		)
	},
}

/** Vertical stacks the items, and the arrow keys move up and down. */
export const Vertical: Story = {
	args: { orientation: 'vertical', spacing: 0, variant: 'outline' },
	play: async ({ canvas, userEvent }) => {
		const [left, center] = canvas.getAllByRole('button') as HTMLElement[]
		await expect(center.getBoundingClientRect().top).toBe(left.getBoundingClientRect().bottom)
		await expect(getComputedStyle(left).borderTopRightRadius).toBe('8px')
		await expect(getComputedStyle(left).borderBottomLeftRadius).toBe('0px')
		await userEvent.tab()
		await expect(left).toHaveFocus()
		await userEvent.keyboard('{ArrowDown}')
		await expect(center).toHaveFocus()
	},
}

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvas }) => {
		for (const button of canvas.getAllByRole('button')) {
			await expect(button).toBeDisabled()
			await expect(getComputedStyle(button).opacity).toBe('0.5')
		}
	},
}
