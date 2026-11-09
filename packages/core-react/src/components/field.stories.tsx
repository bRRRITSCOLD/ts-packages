import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Checkbox } from './checkbox.js'
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
} from './field.js'
import { Input } from './input.js'
import { Switch } from './switch.js'

/**
 * `title` is the library component's Penpot path; one story per `orientation`, then the parts:
 * FieldSet with each `FieldLegend` variant, FieldSeparator and FieldError.
 */
const meta = {
	title: 'Components/Field',
	component: Field,
	render: (args) => (
		<FieldGroup className="w-96">
			<Field {...args}>
				<FieldLabel htmlFor="field-story-username">Username</FieldLabel>
				<Input id="field-story-username" placeholder="ada" />
				<FieldDescription>Choose a unique username.</FieldDescription>
			</Field>
		</FieldGroup>
	),
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByRole('textbox', { name: 'Username' })
		await userEvent.type(input, 'ada')
		await expect(input).toHaveValue('ada')
	},
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Vertical: Story = {}

export const Horizontal: Story = {
	args: { orientation: 'horizontal' },
	render: (args) => (
		<FieldGroup className="w-96">
			<Field {...args}>
				<Switch id="field-story-marketing" />
				<FieldContent>
					<FieldLabel htmlFor="field-story-marketing">Marketing emails</FieldLabel>
					<FieldDescription>Product news, at most once a month.</FieldDescription>
				</FieldContent>
			</Field>
		</FieldGroup>
	),
	play: async ({ canvas, userEvent }) => {
		const control = canvas.getByRole('switch', { name: 'Marketing emails' })
		await userEvent.click(control)
		await expect(control).toHaveAttribute('aria-checked', 'true')
	},
}

export const Responsive: Story = { args: { orientation: 'responsive' } }

export const Legend: Story = {
	render: () => (
		<FieldSet className="w-96">
			<FieldLegend>Notifications</FieldLegend>
			<FieldDescription>Where we reach you.</FieldDescription>
			<FieldGroup className="gap-3">
				<Field orientation="horizontal">
					<Checkbox id="field-story-email" defaultChecked />
					<FieldLabel htmlFor="field-story-email">Email</FieldLabel>
				</Field>
				<Field orientation="horizontal">
					<Checkbox id="field-story-sms" />
					<FieldLabel htmlFor="field-story-sms">SMS</FieldLabel>
				</Field>
			</FieldGroup>
		</FieldSet>
	),
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.getByRole('group', { name: 'Notifications' })).toBeVisible()
		await userEvent.click(canvas.getByText('SMS'))
		await expect(canvas.getByRole('checkbox', { name: 'SMS' })).toBeChecked()
	},
}

export const LegendAsLabel: Story = {
	render: () => (
		<FieldSet className="w-96">
			<FieldLegend variant="label">Contact</FieldLegend>
			<Field>
				<FieldLabel htmlFor="field-story-phone">Phone</FieldLabel>
				<Input id="field-story-phone" type="tel" />
			</Field>
		</FieldSet>
	),
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('group', { name: 'Contact' })).toBeVisible()
	},
}

export const Separator: Story = {
	render: () => (
		<FieldGroup className="w-96">
			<Field>
				<FieldLabel htmlFor="field-story-first">First name</FieldLabel>
				<Input id="field-story-first" />
			</Field>
			<FieldSeparator>Or</FieldSeparator>
			<Field>
				<FieldLabel htmlFor="field-story-last">Last name</FieldLabel>
				<Input id="field-story-last" />
			</Field>
		</FieldGroup>
	),
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('separator')).toBeVisible()
		await expect(canvas.getByText('Or')).toBeVisible()
	},
}

export const Invalid: Story = {
	render: () => (
		<FieldGroup className="w-96">
			<Field data-invalid>
				<FieldLabel htmlFor="field-story-email-invalid">Email</FieldLabel>
				<Input id="field-story-email-invalid" aria-invalid defaultValue="ada@" />
				<FieldError
					errors={[
						{ message: 'Enter a valid email.' },
						{ message: 'Enter a valid email.' },
					]}
				/>
			</Field>
		</FieldGroup>
	),
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('alert')).toHaveTextContent('Enter a valid email.')
		await expect(canvas.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
			'aria-invalid',
			'true'
		)
	},
}
