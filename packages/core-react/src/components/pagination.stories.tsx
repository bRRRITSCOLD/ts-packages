import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from './pagination.js'

/**
 * `title` is the library component's Penpot path. A `nav` named "pagination" holding a list of
 * links: Previous, the pages (the current one `outline` and `aria-current="page"`, the rest
 * `ghost`), an ellipsis for a gap, Next. A link is Base UI's Button rendering an `<a>`, so it has
 * `role="button"`, not `link`.
 */
const meta = {
	title: 'Components/Pagination',
	component: Pagination,
	render: (args) => (
		<Pagination {...args}>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious href="#page-1" />
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="#page-1">1</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="#page-2" isActive>
						2
					</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink href="#page-3">3</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationEllipsis data-testid="ellipsis" />
				</PaginationItem>
				<PaginationItem>
					<PaginationNext href="#page-3" />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	),
	play: async ({ canvas }) => {
		const nav = canvas.getByRole('navigation', { name: 'pagination' })
		await expect(nav).toBeVisible()
		const current = canvas.getByRole('button', { name: '2' })
		await expect(current).toHaveAttribute('aria-current', 'page')
		await expect(current).toHaveAttribute('href', '#page-2')
		const other = canvas.getByRole('button', { name: '3' })
		await expect(other).not.toHaveAttribute('aria-current')
		// The current page is `outline`: a border the other pages' `ghost` leaves transparent.
		await expect(getComputedStyle(current).borderColor).not.toBe(
			getComputedStyle(other).borderColor
		)
		await expect(canvas.getByRole('button', { name: 'Go to previous page' })).toBeVisible()
		await expect(canvas.getByRole('button', { name: 'Go to next page' })).toBeVisible()
		const ellipsis = canvas.getByTestId('ellipsis')
		await expect(ellipsis).toHaveAttribute('aria-hidden', 'true')
		await expect(ellipsis.getBoundingClientRect().width).toBe(36)
	},
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
