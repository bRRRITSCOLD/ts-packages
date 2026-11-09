import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'

import { SlashIcon } from '../icons.js'
import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from './breadcrumb.js'

/**
 * `title` is the library component's Penpot path. A `nav` named "breadcrumb" holding an ordered
 * list: links, then the current page (`aria-current="page"`), with presentational separators
 * between them (a chevron unless a child replaces it).
 */
const meta = {
	title: 'Components/Breadcrumb',
	component: Breadcrumb,
	render: (args) => (
		<Breadcrumb {...args}>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="#home">Home</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator data-testid="separator" />
				<BreadcrumbItem>
					<BreadcrumbLink href="#components">Components</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator data-testid="separator" />
				<BreadcrumbItem>
					<BreadcrumbPage>Breadcrumb</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	),
} satisfies Meta<typeof Breadcrumb>

export default meta
type Story = StoryObj<typeof meta>

/** Links are muted and turn `foreground` on hover; the current page is `foreground`. */
export const Default: Story = {
	play: async ({ canvas, userEvent }) => {
		const nav = canvas.getByRole('navigation', { name: 'breadcrumb' })
		await expect(canvas.getAllByRole('listitem')).toHaveLength(3)
		const page = canvas.getByText('Breadcrumb')
		await expect(page).toHaveAttribute('aria-current', 'page')
		const home = canvas.getByRole('link', { name: 'Home' })
		const muted = getComputedStyle(home).color
		await expect(getComputedStyle(page).color).not.toBe(muted)
		await userEvent.hover(home)
		await waitFor(() => expect(getComputedStyle(home).color).toBe(getComputedStyle(page).color))

		const separators = canvas.getAllByTestId('separator')
		await expect(separators).toHaveLength(2)
		const chevron = (separators[0] as Element).querySelector('svg') as SVGElement
		await expect(chevron.getBoundingClientRect().width).toBe(14)
		await expect(getComputedStyle(nav.querySelector('ol') as Element).fontSize).toBe('14px')
	},
}

/** A collapsed run of links is an ellipsis: a 20px box, its 16px icon, "More" for screen readers. */
export const Collapsed: Story = {
	render: (args) => (
		<Breadcrumb {...args}>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="#home">Home</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator data-testid="separator" />
				<BreadcrumbItem>
					<BreadcrumbEllipsis data-testid="ellipsis" />
				</BreadcrumbItem>
				<BreadcrumbSeparator data-testid="separator" />
				<BreadcrumbItem>
					<BreadcrumbPage>Breadcrumb</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	),
	play: async ({ canvas }) => {
		const ellipsis = canvas.getByTestId('ellipsis')
		await expect(ellipsis).toHaveTextContent('More')
		await expect(ellipsis.getBoundingClientRect().width).toBe(20)
		await expect(
			(ellipsis.querySelector('svg') as SVGElement).getBoundingClientRect().width
		).toBe(16)
	},
}

/** A separator's child replaces the chevron, at the same 14px. */
export const CustomSeparator: Story = {
	render: (args) => (
		<Breadcrumb {...args}>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="#home">Home</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator data-testid="separator">
					<SlashIcon />
				</BreadcrumbSeparator>
				<BreadcrumbItem>
					<BreadcrumbPage>Breadcrumb</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	),
	play: async ({ canvas }) => {
		const separator = canvas.getByTestId('separator')
		await expect(separator).toHaveAttribute('aria-hidden', 'true')
		await expect(separator?.querySelector('svg')).toHaveClass('lucide-slash')
		await expect(separator?.querySelector('svg')?.getBoundingClientRect().width).toBe(14)
	},
}
