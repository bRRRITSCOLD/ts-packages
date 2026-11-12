// node_modules
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

// testee
import { SidebarMenuButton } from '../../src/components/sidebar.js'

describe('SidebarMenuButton', () => {
	afterEach(cleanup)

	describe('isActive', () => {
		it('should mark the row data-active="true" when active', () => {
			render(<SidebarMenuButton isActive>Inbox</SidebarMenuButton>)

			expect(screen.getByRole('button', { name: 'Inbox' }).getAttribute('data-active')).toBe(
				'true'
			)
		})

		it('should default to data-active="false"', () => {
			render(<SidebarMenuButton>Inbox</SidebarMenuButton>)

			expect(screen.getByRole('button', { name: 'Inbox' }).getAttribute('data-active')).toBe(
				'false'
			)
		})
	})

	describe('render', () => {
		it('should render as the element it is given, keeping its href and the row data attributes', () => {
			render(
				<SidebarMenuButton isActive render={<a href="/inbox" />}>
					Inbox
				</SidebarMenuButton>
			)

			const link = screen.getByRole('link', { name: 'Inbox' })
			expect(link.getAttribute('href')).toBe('/inbox')
			expect(link.getAttribute('data-active')).toBe('true')
			expect(link.getAttribute('data-slot')).toBe('sidebar-menu-button')
			expect(screen.queryByRole('button')).toBeNull()
		})
	})
})
