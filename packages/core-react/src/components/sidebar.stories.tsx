import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { CalendarIcon, InboxIcon, SearchIcon, SettingsIcon, UserIcon } from '../icons.js'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from './sidebar.js'

const ITEMS = [
	{ label: 'Inbox', href: '#inbox', icon: <InboxIcon />, count: 12 },
	{ label: 'Calendar', href: '#calendar', icon: <CalendarIcon />, count: 3 },
	{ label: 'Search', href: '#search', icon: <SearchIcon />, count: undefined },
	{ label: 'Settings', href: '#settings', icon: <SettingsIcon />, count: undefined },
]

type Row = { links?: boolean; active?: string; badges?: boolean }

/** A static sidebar: a header, one group of rows, a separator and a footer row. */
const sidebar = ({ links = false, active, badges = false }: Row = {}) => (
	<Sidebar data-testid="sidebar" aria-label="Workspace">
		<SidebarHeader data-testid="sidebar-header">
			<span className="px-2 text-sm font-medium">Acme</span>
		</SidebarHeader>
		<SidebarContent>
			<SidebarGroup data-testid="sidebar-group">
				<SidebarGroupLabel data-testid="sidebar-group-label">Workspace</SidebarGroupLabel>
				<SidebarMenu>
					{ITEMS.map((item) => (
						<SidebarMenuItem key={item.label}>
							<SidebarMenuButton
								isActive={item.label === active}
								render={links ? <a href={item.href} /> : undefined}
								aria-current={links && item.label === active ? 'page' : undefined}
							>
								{item.icon}
								<span>{item.label}</span>
							</SidebarMenuButton>
							{badges && item.count !== undefined && (
								<SidebarMenuBadge data-testid={`badge-${item.label}`}>
									{item.count}
								</SidebarMenuBadge>
							)}
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroup>
		</SidebarContent>
		<SidebarSeparator data-testid="sidebar-separator" />
		<SidebarFooter>
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton>
						<UserIcon />
						<span>Account</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarFooter>
	</Sidebar>
)

/**
 * `title` is the library component's Penpot path. A static, non-collapsible sidebar: an `<aside>`
 * at `--sidebar-width` (16rem) on the `sidebar` fill. A group holds a muted label and a menu of
 * 32px rows; a row is a button, or a link through Base UI's `render`, and `isActive` marks the
 * current one (`data-active`) on `sidebar-accent`. Name the aside (`aria-label`) when a page has
 * more than one.
 */
const meta = {
	title: 'Components/Sidebar',
	component: Sidebar,
	render: () => sidebar(),
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

/** A colour serialised by the browser as it serialises a computed colour. */
const colorOf = (root: HTMLElement, color: string) => {
	const probe = document.createElement('span')
	probe.style.color = color
	root.append(probe)
	const computed = getComputedStyle(probe).color
	probe.remove()
	return computed
}

/** A token's resolved colour. */
const tokenColor = (root: HTMLElement, name: string) =>
	colorOf(root, getComputedStyle(root).getPropertyValue(`--${name}`))

const box = (el: Element) => el.getBoundingClientRect()

/**
 * Rows are 32px buttons with a 16px icon, transparent on the `sidebar` fill in
 * `sidebar-foreground`; a hovered row turns `sidebar-accent`, as an active one is. The group
 * label is a 32px `muted-foreground` row with its text centred; the separator is a 1px
 * `sidebar-border` rule inset 8px each side.
 */
export const Default: Story = {
	play: async ({ canvas, canvasElement }) => {
		const aside = canvas.getByRole('complementary', { name: 'Workspace' })
		await expect(box(aside).width).toBe(256)
		await expect(getComputedStyle(aside).backgroundColor).toBe(
			tokenColor(canvasElement, 'sidebar')
		)
		await expect(getComputedStyle(aside).color).toBe(
			tokenColor(canvasElement, 'sidebar-foreground')
		)

		const rows = canvas.getAllByRole('button')
		await expect(rows).toHaveLength(5)
		const inbox = canvas.getByRole('button', { name: 'Inbox' })
		await expect(box(inbox).height).toBe(32)
		await expect(box(inbox.querySelector('svg') as SVGElement).width).toBe(16)
		await expect(inbox).toHaveAttribute('data-active', 'false')
		await expect(getComputedStyle(inbox).backgroundColor).toBe(
			colorOf(canvasElement, 'transparent')
		)

		const label = canvas.getByTestId('sidebar-group-label')
		await expect(box(label).height).toBe(32)
		await expect(getComputedStyle(label).alignItems).toBe('center')
		await expect(getComputedStyle(label).color).toBe(
			tokenColor(canvasElement, 'muted-foreground')
		)

		const separator = canvas.getByTestId('sidebar-separator')
		await expect(separator).toHaveAttribute('role', 'separator')
		await expect(box(separator).height).toBe(1)
		await expect(box(separator).left - box(aside).left).toBe(8)
		await expect(box(aside).right - box(separator).right).toBe(8)
		await expect(getComputedStyle(separator).backgroundColor).toBe(
			tokenColor(canvasElement, 'sidebar-border')
		)
	},
}

/**
 * Rows rendered as links through `render`; the current one has `isActive` (and the caller's
 * `aria-current="page"`): `sidebar-accent` fill, `font-medium`, `sidebar-accent-foreground`. A
 * focused row shows the `sidebar-ring`.
 */
export const ActiveItem: Story = {
	render: () => sidebar({ links: true, active: 'Inbox' }),
	play: async ({ canvas, canvasElement, userEvent }) => {
		const inbox = canvas.getByRole('link', { name: 'Inbox' })
		await expect(inbox).toHaveAttribute('href', '#inbox')
		await expect(inbox).toHaveAttribute('data-active', 'true')
		await expect(inbox).toHaveAttribute('aria-current', 'page')
		await expect(getComputedStyle(inbox).backgroundColor).toBe(
			tokenColor(canvasElement, 'sidebar-accent')
		)
		await expect(getComputedStyle(inbox).color).toBe(
			tokenColor(canvasElement, 'sidebar-accent-foreground')
		)
		await expect(getComputedStyle(inbox).fontWeight).toBe('500')

		const calendar = canvas.getByRole('link', { name: 'Calendar' })
		await expect(calendar).toHaveAttribute('data-active', 'false')
		await expect(getComputedStyle(calendar).backgroundColor).toBe(
			colorOf(canvasElement, 'transparent')
		)
		await expect(getComputedStyle(calendar).fontWeight).toBe('400')

		await userEvent.tab()
		await expect(inbox).toHaveFocus()
		await expect(getComputedStyle(inbox).boxShadow).toContain(
			tokenColor(canvasElement, 'sidebar-ring')
		)
	},
}

/**
 * A count after a row, centred on its 32px height 4px from the right, in `muted-foreground`
 * (`sidebar-accent-foreground` on a hovered or active row). The row keeps 32px clear for it.
 */
export const WithBadges: Story = {
	render: () => sidebar({ links: true, active: 'Inbox', badges: true }),
	play: async ({ canvas, canvasElement }) => {
		const calendar = canvas.getByRole('link', { name: 'Calendar' })
		const badge = canvas.getByTestId('badge-Calendar')
		await expect(badge).toHaveTextContent('3')
		await expect(box(badge).height).toBe(20)
		await expect(box(badge).top - box(calendar).top).toBe(6)
		await expect(box(calendar).right - box(badge).right).toBe(4)
		await expect(getComputedStyle(badge).color).toBe(
			tokenColor(canvasElement, 'muted-foreground')
		)
		await expect(getComputedStyle(calendar).paddingRight).toBe('32px')

		const active = canvas.getByTestId('badge-Inbox')
		await expect(getComputedStyle(active).color).toBe(
			tokenColor(canvasElement, 'sidebar-accent-foreground')
		)
		// A row with no count keeps its 8px padding.
		const search = canvas.getByRole('link', { name: 'Search' })
		await expect(getComputedStyle(search).paddingRight).toBe('8px')
	},
}

/**
 * Dark mode: the `sidebar` fill equals `card` (`neutral.900`) and the active row `accent`
 * (`neutral.800`).
 */
export const Dark: Story = {
	globals: { theme: 'dark' },
	render: () => sidebar({ links: true, active: 'Inbox', badges: true }),
	play: async ({ canvas, canvasElement }) => {
		await expect(document.documentElement).toHaveClass('dark')
		const aside = canvas.getByRole('complementary', { name: 'Workspace' })
		await expect(tokenColor(canvasElement, 'sidebar')).toBe(tokenColor(canvasElement, 'card'))
		await expect(getComputedStyle(aside).backgroundColor).toBe(
			tokenColor(canvasElement, 'sidebar')
		)
		const inbox = canvas.getByRole('link', { name: 'Inbox' })
		await expect(getComputedStyle(inbox).backgroundColor).toBe(
			tokenColor(canvasElement, 'accent')
		)
		await expect(getComputedStyle(inbox).color).toBe(
			tokenColor(canvasElement, 'sidebar-accent-foreground')
		)
	},
}
