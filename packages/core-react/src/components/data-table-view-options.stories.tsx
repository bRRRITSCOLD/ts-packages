import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, screen, waitFor } from 'storybook/test'

import { DataTableViewOptions } from './data-table-view-options.js'

/**
 * `title` is the library component's Penpot path. An outline "View" button (`Settings2` icon)
 * opening "Toggle columns": a checkbox item per column that can hide, checked while it shows. A
 * pick keeps the menu open. Plain props: `useDataTable`'s `getViewOptionsProps` supplies them.
 */
const meta = {
	title: 'Components/DataTableViewOptions',
	component: DataTableViewOptions,
	args: {
		columns: [
			{ id: 'email', label: 'Email', visible: true },
			{ id: 'amount', label: 'Amount', visible: true },
			{ id: 'status', label: 'Status', visible: false },
		],
		onVisibilityChange: fn(),
	},
	render: function Render(args) {
		const [columns, setColumns] = useState(args.columns)
		return (
			<DataTableViewOptions
				{...args}
				columns={columns}
				onVisibilityChange={(id, visible) => {
					setColumns((all) => all.map((c) => (c.id === id ? { ...c, visible } : c)))
					args.onVisibilityChange(id, visible)
				}}
			/>
		)
	},
	play: async ({ args, canvas, userEvent }) => {
		const trigger = canvas.getByRole('button', { name: 'View' })
		await expect(trigger.getBoundingClientRect().height).toBe(32)
		await userEvent.click(trigger)
		const menu = await screen.findByRole('menu')
		await waitFor(() => expect(menu).toBeVisible())
		await expect(screen.getByText('Toggle columns')).toBeVisible()
		const amount = screen.getByRole('menuitemcheckbox', { name: 'Amount' })
		await expect(amount).toHaveAttribute('aria-checked', 'true')
		await expect(screen.getByRole('menuitemcheckbox', { name: 'Status' })).toHaveAttribute(
			'aria-checked',
			'false'
		)
		await userEvent.click(amount)
		await expect(args.onVisibilityChange).toHaveBeenCalledWith('amount', false)
		await expect(amount).toHaveAttribute('aria-checked', 'false')
		await expect(menu).toBeVisible()
	},
} satisfies Meta<typeof DataTableViewOptions>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
