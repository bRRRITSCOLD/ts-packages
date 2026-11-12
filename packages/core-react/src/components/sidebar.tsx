'use client'

// Vendored from shadcn's base-vega registry (Base UI `useRender` for the menu button), trimmed to
// the static parts (promotion #149): no SidebarProvider / useSidebar, collapse, mobile Sheet,
// Trigger, Rail, Inset, Input, GroupAction, MenuAction or MenuSub*, and no MenuButton `variant`
// or `size`. They only wrap these parts, so adding them later breaks nothing. The edits (see
// README → Vendoring):
// - Sidebar is the non-collapsible arm on an `<aside>`. Its width reads `--sidebar-width`, which
//   upstream's provider set to `16rem`; with no provider the aside declares it from `space.64`
//   (256px), and a caller overrides it through `style` or a class.
// - The parts carry `data-slot` only, not upstream's duplicate `data-sidebar`.
// - SidebarGroupLabel is `text-muted-foreground`, not `text-sidebar-foreground/70`: a per-use
//   alpha has no token. It drops the collapse transition and focus ring (it isn't focusable).
// - SidebarMenuButton writes `data-active="true"` / `"false"` itself, as the Radix flavour does,
//   so `data-[active=true]:` matches; Base UI's `useRender` state would set a bare `data-active`.
// - SidebarMenuBadge sits `top-1.5`, centred on the 32px row (upstream's default-size arm), and
//   is `text-muted-foreground`, the draft's count colour, with no radius or weight. On a hovered
//   or active row it turns `sidebar-accent-foreground`, as upstream's does: light's
//   `muted-foreground` on `sidebar-accent` reads at 4.36:1, under AA.
// - SidebarSeparator is a horizontal Separator (`h-px`) whose width is `auto`, not `w-full`, so
//   `mx-2` insets it instead of pushing it 16px past the sidebar.
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import type * as React from 'react'
import { cn } from '../lib/utils.js'
import { Separator } from './separator.js'

function Sidebar({ className, ...props }: React.ComponentProps<'aside'>) {
	return (
		<aside
			data-slot="sidebar"
			className={cn(
				'flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground [--sidebar-width:var(--spacing-64)]',
				className
			)}
			{...props}
		/>
	)
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-header"
			className={cn('flex flex-col gap-2 p-2', className)}
			{...props}
		/>
	)
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-content"
			className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto', className)}
			{...props}
		/>
	)
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-group"
			className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
			{...props}
		/>
	)
}

function SidebarGroupLabel({ className, render, ...props }: useRender.ComponentProps<'div'>) {
	return useRender({
		defaultTagName: 'div',
		props: mergeProps<'div'>(
			{
				className: cn(
					'flex h-8 shrink-0 items-center px-2 text-xs font-medium text-muted-foreground',
					className
				),
			},
			props
		),
		render,
		state: { slot: 'sidebar-group-label' },
	})
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
	return (
		<ul
			data-slot="sidebar-menu"
			className={cn('flex w-full min-w-0 flex-col gap-1', className)}
			{...props}
		/>
	)
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
	return (
		<li
			data-slot="sidebar-menu-item"
			className={cn('group/menu-item relative', className)}
			{...props}
		/>
	)
}

function SidebarMenuButton({
	className,
	isActive = false,
	render,
	...props
}: useRender.ComponentProps<'button'> & { isActive?: boolean }) {
	return useRender({
		defaultTagName: 'button',
		props: mergeProps<'button'>(
			{
				'data-active': isActive,
				className: cn(
					'peer/menu-button flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-sidebar-foreground outline-hidden ring-sidebar-ring group-has-data-[slot=sidebar-menu-badge]/menu-item:pr-8 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0',
					className
				),
			} as React.ComponentProps<'button'>,
			props
		),
		render,
		state: { slot: 'sidebar-menu-button' },
	})
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-menu-badge"
			className={cn(
				'pointer-events-none absolute top-1.5 right-1 flex h-5 min-w-5 items-center justify-center gap-1 px-1 text-xs tabular-nums text-muted-foreground select-none peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
				className
			)}
			{...props}
		/>
	)
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-slot="sidebar-separator"
			className={cn('mx-2 bg-sidebar-border data-[orientation=horizontal]:w-auto', className)}
			{...props}
		/>
	)
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-footer"
			className={cn('flex flex-col gap-2 p-2', className)}
			{...props}
		/>
	)
}

export {
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
}
