import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'

import { Button } from './button.js'
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from './card.js'

/**
 * `title` is the library component's Penpot path; one story per `size`. Header, Content, Footer
 * and Action are open content areas: the card spaces them, the caller fills them.
 */
const meta = {
	title: 'Components/Card',
	component: Card,
	render: (args) => (
		<Card data-testid="card" {...args} className="max-w-sm">
			<CardHeader data-testid="card-header">
				<CardTitle data-testid="card-title">Team plan</CardTitle>
				<CardDescription data-testid="card-description">
					Billed monthly, cancel any time.
				</CardDescription>
				<CardAction data-testid="card-action">
					<Button variant="outline" size="sm">
						Change
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent data-testid="card-content">
				<p>Five seats, shared projects and priority support.</p>
			</CardContent>
			<CardFooter data-testid="card-footer">
				<Button className="w-full">Upgrade</Button>
			</CardFooter>
		</Card>
	),
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

const slot = (root: HTMLElement, name: string) => within(root).getByTestId(name)

/** `--card-spacing` steps, read off the rendered parts: padding, the gap between parts, the title size. */
const expectSpacing = async (root: HTMLElement, spacing: number, titleSize: string) => {
	const card = slot(root, 'card')
	const header = slot(root, 'card-header')
	const content = slot(root, 'card-content')
	await expect(getComputedStyle(card).paddingTop).toBe(`${spacing}px`)
	await expect(getComputedStyle(card).paddingBottom).toBe(`${spacing}px`)
	await expect(getComputedStyle(header).paddingLeft).toBe(`${spacing}px`)
	await expect(getComputedStyle(content).paddingRight).toBe(`${spacing}px`)
	await expect(getComputedStyle(slot(root, 'card-footer')).paddingLeft).toBe(`${spacing}px`)
	await expect(content.getBoundingClientRect().top - header.getBoundingClientRect().bottom).toBe(
		spacing
	)
	await expect(getComputedStyle(slot(root, 'card-title')).fontSize).toBe(titleSize)
}

/**
 * 24px padding and gaps, `rounded-xl` corners (`border-radius.xl`, 14px). The action sits at the
 * header's right edge, beside the title and description, which stack.
 */
export const Default: Story = {
	play: async ({ canvasElement }) => {
		await expectSpacing(canvasElement, 24, '16px')
		const card = slot(canvasElement, 'card')
		await expect(getComputedStyle(card).borderTopLeftRadius).toBe('14px')

		const header = slot(canvasElement, 'card-header').getBoundingClientRect()
		const action = slot(canvasElement, 'card-action').getBoundingClientRect()
		const title = slot(canvasElement, 'card-title').getBoundingClientRect()
		const description = slot(canvasElement, 'card-description').getBoundingClientRect()
		await expect(action.right).toBe(header.right - 24)
		await expect(action.top).toBe(title.top)
		await expect(description.top).toBeGreaterThanOrEqual(title.bottom)
		await expect(description.right).toBeLessThanOrEqual(action.left)
	},
}

/** `size` sm tightens padding and gaps to 16px and the title to `text-sm`. */
export const Small: Story = {
	args: { size: 'sm' },
	play: async ({ canvasElement }) => {
		await expectSpacing(canvasElement, 16, '14px')
	},
}

/** A header with `border-b` (and a footer with `border-t`) pads its ruled side by the spacing too. */
export const Bordered: Story = {
	render: (args) => (
		<Card data-testid="card" {...args} className="max-w-sm">
			<CardHeader data-testid="card-header" className="border-b">
				<CardTitle data-testid="card-title">Team plan</CardTitle>
			</CardHeader>
			<CardContent data-testid="card-content">
				<p>Five seats, shared projects and priority support.</p>
			</CardContent>
			<CardFooter data-testid="card-footer" className="border-t">
				<Button className="w-full">Upgrade</Button>
			</CardFooter>
		</Card>
	),
	play: async ({ canvasElement }) => {
		await expect(getComputedStyle(slot(canvasElement, 'card-header')).paddingBottom).toBe(
			'24px'
		)
		await expect(getComputedStyle(slot(canvasElement, 'card-footer')).paddingTop).toBe('24px')
	},
}

/** Bordered at `size` sm: the ruled side's padding follows the size down to 16px. */
export const BorderedSmall: Story = {
	...Bordered,
	args: { size: 'sm' },
	play: async ({ canvasElement }) => {
		await expect(getComputedStyle(slot(canvasElement, 'card-header')).paddingBottom).toBe(
			'16px'
		)
		await expect(getComputedStyle(slot(canvasElement, 'card-footer')).paddingTop).toBe('16px')
	},
}
