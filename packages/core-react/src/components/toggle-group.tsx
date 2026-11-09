'use client'

// Vendored from shadcn's base-vega registry (Base UI ToggleGroup). Kept close to upstream so a re-pull
// diffs cleanly (see README → Vendoring): `spacing` is a literal union `0 | 1 | 2` mapped to
// `gap-*` steps, where upstream took any number into `gap-[--spacing(var(--gap))]`, which steps off
// the tokens; `orientation` reaches Base UI, so the arrow keys follow it; `data-horizontal:` /
// `data-vertical:` are `data-[orientation=…]:`, and the item's `data-[state=on]:` is
// `data-pressed:`, the attributes Base UI 1.9 sets.

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'
import type { VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../lib/utils.js'

import { toggleVariants } from './toggle.js'

/** `spacing` → the gap between items; 0 joins them. A literal union, so each step reads a token. */
const SPACING = { 0: 'gap-0', 1: 'gap-1', 2: 'gap-2' } as const

const ToggleGroupContext = React.createContext<
	VariantProps<typeof toggleVariants> & {
		spacing?: keyof typeof SPACING
		orientation?: 'horizontal' | 'vertical'
	}
>({
	size: 'default',
	variant: 'default',
	spacing: 2,
	orientation: 'horizontal',
})

function ToggleGroup({
	className,
	variant,
	size,
	spacing = 2,
	orientation = 'horizontal',
	children,
	...props
}: ToggleGroupPrimitive.Props &
	VariantProps<typeof toggleVariants> & {
		spacing?: keyof typeof SPACING
	}) {
	return (
		<ToggleGroupPrimitive
			data-slot="toggle-group"
			data-variant={variant}
			data-size={size}
			data-spacing={spacing}
			orientation={orientation}
			className={cn(
				'group/toggle-group flex w-fit flex-row items-center rounded-md data-[spacing=0]:data-[variant=outline]:shadow-xs data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
				SPACING[spacing],
				className
			)}
			{...props}
		>
			<ToggleGroupContext.Provider value={{ variant, size, spacing, orientation }}>
				{children}
			</ToggleGroupContext.Provider>
		</ToggleGroupPrimitive>
	)
}

function ToggleGroupItem({
	className,
	children,
	variant = 'default',
	size = 'default',
	...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
	const context = React.useContext(ToggleGroupContext)

	return (
		<TogglePrimitive
			data-slot="toggle-group-item"
			data-variant={context.variant || variant}
			data-size={context.size || size}
			data-spacing={context.spacing}
			className={cn(
				'shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 group-data-[spacing=0]/toggle-group:shadow-none focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first:rounded-l-md group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first:rounded-t-md group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:last:rounded-r-md group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last:rounded-b-md data-pressed:bg-muted group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t',
				toggleVariants({
					variant: context.variant || variant,
					size: context.size || size,
				}),
				className
			)}
			{...props}
		>
			{children}
		</TogglePrimitive>
	)
}

export { ToggleGroup, ToggleGroupItem }
