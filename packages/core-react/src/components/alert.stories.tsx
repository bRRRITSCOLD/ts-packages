import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { CircleCheckIcon, InfoIcon } from '../icons.js'
import { Alert, AlertAction, AlertDescription, AlertTitle } from './alert.js'
import { Button } from './button.js'

/**
 * `title` is the library component's Penpot path; one story per `variant`, plus the icon-less and
 * action layouts. With an icon, the icon takes a column of its own and the text the rest.
 */
const meta = {
	title: 'Components/Alert',
	component: Alert,
	render: (args) => (
		<Alert {...args}>
			<CircleCheckIcon />
			<AlertTitle>Payment successful</AlertTitle>
			<AlertDescription>Your payment of $29.99 has been processed.</AlertDescription>
		</Alert>
	),
	play: async ({ canvas }) => {
		const alert = canvas.getByRole('alert')
		const icon = alert.querySelector('svg') as SVGElement
		const title = canvas.getByText('Payment successful')
		await expect(icon.getBoundingClientRect().width).toBe(16)
		// The text column starts one gap-x-2.5 (10px) right of the icon and runs to the padding.
		await expect(title.getBoundingClientRect().left - icon.getBoundingClientRect().right).toBe(
			10
		)
		await expect(canvas.getByText(/has been processed/).getBoundingClientRect().left).toBe(
			title.getBoundingClientRect().left
		)
		await expect(alert).toHaveAttribute('data-slot', 'alert')
	},
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Title, icon and description turn `destructive`; the description at 90%. */
export const Destructive: Story = {
	args: { variant: 'destructive' },
	play: async ({ canvas }) => {
		const alert = canvas.getByRole('alert')
		const title = canvas.getByText('Payment successful')
		await expect(getComputedStyle(title).color).toBe(getComputedStyle(alert).color)
		await expect(getComputedStyle(canvas.getByText(/has been processed/)).color).not.toBe(
			getComputedStyle(title).color
		)
	},
}

/** Without an icon the text spans the whole alert. */
export const WithoutIcon: Story = {
	render: (args) => (
		<Alert {...args}>
			<AlertTitle>Heads up!</AlertTitle>
			<AlertDescription>You can add components to your app using the CLI.</AlertDescription>
		</Alert>
	),
	play: async ({ canvas }) => {
		const alert = canvas.getByRole('alert')
		// px-4 plus the 1px border.
		await expect(
			canvas.getByText('Heads up!').getBoundingClientRect().left -
				alert.getBoundingClientRect().left
		).toBe(17)
	},
}

/** An action sits top right, and the alert makes room for it with `pr-18` (72px). */
export const WithAction: Story = {
	render: (args) => (
		<Alert {...args}>
			<InfoIcon />
			<AlertTitle>Update available</AlertTitle>
			<AlertDescription>A new version is ready to install.</AlertDescription>
			<AlertAction>
				<Button size="xs">Install</Button>
			</AlertAction>
		</Alert>
	),
	play: async ({ canvas }) => {
		const alert = canvas.getByRole('alert')
		await expect(getComputedStyle(alert).paddingRight).toBe('72px')
		await expect(canvas.getByRole('button', { name: 'Install' })).toBeVisible()
	},
}
