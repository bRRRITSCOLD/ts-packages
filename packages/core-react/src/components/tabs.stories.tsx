import type { Meta, StoryObj } from '@storybook/react-vite'
import type * as React from 'react'
import { expect, fn, waitFor, within } from 'storybook/test'

import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.js'

const TABS = [
	{ value: 'account', label: 'Account', body: 'Change your name and email address.' },
	{ value: 'password', label: 'Password', body: 'Change your password.' },
	{ value: 'billing', label: 'Billing', body: 'Manage your plan and invoices.' },
]

/** The tabs every story renders; `variant` reaches the list, `disabledTab` disables one tab. */
function SettingsTabs({
	variant,
	disabledTab,
	...props
}: React.ComponentProps<typeof Tabs> & {
	variant?: 'default' | 'line'
	disabledTab?: string
}) {
	return (
		<Tabs defaultValue="account" data-testid="tabs" {...props}>
			<TabsList variant={variant} data-testid="tabs-list">
				{TABS.map(({ value, label }) => (
					<TabsTrigger key={value} value={value} disabled={value === disabledTab}>
						{label}
					</TabsTrigger>
				))}
			</TabsList>
			{TABS.map(({ value, body }) => (
				<TabsContent key={value} value={value}>
					{body}
				</TabsContent>
			))}
		</Tabs>
	)
}

/**
 * `title` is the library component's Penpot path; one story per list `variant` and orientation.
 * Tabs are `tab`s in a `tablist`; only the active panel is mounted. The arrow keys move focus
 * between tabs without selecting (Base UI's `activateOnFocus` is off): Enter or Space selects.
 */
const meta = {
	title: 'Components/Tabs',
	component: Tabs,
	args: { onValueChange: fn() },
	render: (args) => <SettingsTabs {...args} />,
	play: async ({ args, canvas, userEvent }) => {
		const account = canvas.getByRole('tab', { name: 'Account' })
		const password = canvas.getByRole('tab', { name: 'Password' })
		await expect(account).toHaveAttribute('aria-selected', 'true')
		await userEvent.click(password)
		await expect(password).toHaveAttribute('aria-selected', 'true')
		await expect(args.onValueChange).toHaveBeenLastCalledWith('password', expect.anything())
		// The panel being left stays mounted a moment beside the new one: find a panel by its tab's name.
		await expect(await canvas.findByRole('tabpanel', { name: 'Password' })).toHaveTextContent(
			'Change your password.'
		)
	},
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

const parts = (root: HTMLElement) => ({
	tabs: within(root).getByTestId('tabs'),
	list: within(root).getByTestId('tabs-list'),
})

/**
 * The list sits above the panel, a 36px `muted` track with 4px padding; the active tab is lifted
 * onto `background` with `shadow-sm`.
 */
export const Default: Story = {
	play: async (context) => {
		await meta.play(context)
		const { canvas, canvasElement } = context
		const { tabs, list } = parts(canvasElement)
		await expect(getComputedStyle(tabs).flexDirection).toBe('column')
		await expect(list.getBoundingClientRect().height).toBe(36)
		await expect(getComputedStyle(list).paddingTop).toBe('4px')
		const password = canvas.getByRole('tab', { name: 'Password' })
		const account = canvas.getByRole('tab', { name: 'Account' })
		await expect(password.getBoundingClientRect().height).toBe(28)
		await waitFor(() =>
			expect(getComputedStyle(password).backgroundColor).not.toBe(
				getComputedStyle(account).backgroundColor
			)
		)
		await expect(getComputedStyle(password).boxShadow).not.toBe('none')
	},
}

/** `line`: no track; the active tab is underlined by a 2px `foreground` bar at the list's foot. */
export const Line: Story = {
	args: {},
	render: (args) => <SettingsTabs {...args} variant="line" />,
	play: async (context) => {
		await meta.play(context)
		const { canvas, canvasElement } = context
		const { tabs, list } = parts(canvasElement)
		const password = canvas.getByRole('tab', { name: 'Password' })
		const account = canvas.getByRole('tab', { name: 'Account' })
		// No track: as transparent as the root.
		await expect(getComputedStyle(list).backgroundColor).toBe(
			getComputedStyle(tabs).backgroundColor
		)
		await waitFor(() => expect(getComputedStyle(password, '::after').opacity).toBe('1'))
		// Both bars transition: one can land while the other's ease-out tail is still above 0.
		await waitFor(() => expect(getComputedStyle(account, '::after').opacity).toBe('0'))
		await expect(getComputedStyle(password, '::after').height).toBe('2px')
		const bar =
			password.getBoundingClientRect().bottom -
			Number.parseFloat(getComputedStyle(password, '::after').bottom)
		await expect(bar).toBe(list.getBoundingClientRect().bottom)
	},
}

/**
 * `orientation` vertical puts the list beside the panel and stacks the tabs; the arrow keys move
 * up and down, and moving focus does not select.
 */
export const Vertical: Story = {
	args: { orientation: 'vertical' },
	play: async ({ canvas, canvasElement, userEvent }) => {
		const { tabs, list } = parts(canvasElement)
		await expect(getComputedStyle(tabs).flexDirection).toBe('row')
		await expect(getComputedStyle(list).flexDirection).toBe('column')
		const account = canvas.getByRole('tab', { name: 'Account' })
		const password = canvas.getByRole('tab', { name: 'Password' })
		await expect(password.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			account.getBoundingClientRect().bottom
		)
		await userEvent.tab()
		await expect(account).toHaveFocus()
		await userEvent.keyboard('{ArrowDown}')
		await expect(password).toHaveFocus()
		await expect(account).toHaveAttribute('aria-selected', 'true')
		await userEvent.keyboard('{Enter}')
		await expect(password).toHaveAttribute('aria-selected', 'true')
	},
}

/** A disabled tab stays focusable (`aria-disabled`) at half opacity and can't be selected. */
export const DisabledTab: Story = {
	render: (args) => <SettingsTabs {...args} disabledTab="billing" />,
	play: async ({ canvas }) => {
		const billing = canvas.getByRole('tab', { name: 'Billing' })
		await expect(billing).toHaveAttribute('aria-disabled', 'true')
		await expect(getComputedStyle(billing).opacity).toBe('0.5')
		// pointer-events-none stops a pointer reaching it; a scripted click is ignored too.
		billing.click()
		await expect(billing).toHaveAttribute('aria-selected', 'false')
	},
}
