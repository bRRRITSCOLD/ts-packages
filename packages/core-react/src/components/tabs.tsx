'use client'

// Vendored from shadcn's base-vega registry (Base UI Tabs). Kept close to upstream so a re-pull
// diffs cleanly (see README → Vendoring). `data-horizontal:` / `data-vertical:` (and their
// `group-data-*/tabs:` forms) are `data-[orientation=…]:`: Base UI 1.9 sets `data-orientation`,
// never the bare attributes, so the list never sat above the panel and a vertical list never
// stacked. `orientation` is passed to Base UI as well as to the `data-` attribute (upstream set
// only the attribute), so the arrow keys follow it. The edits put arbitrary values back on tokens:
// the list's `p-[3px]` is `p-1` and the trigger's `h-[calc(100%-1px)]` is `h-full` (a 28px tab in
// the 36px list, where upstream's was 29px), the line underline's `bottom-[-5px]` is `-bottom-1`,
// so it sits on the list's foot (the vertical bar's `-right-1` already did), and `ring-[3px]` is
// `ring-3`. `tabsListVariants` is exported, as every cva config is.

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils.js'

function Tabs({ className, orientation = 'horizontal', ...props }: TabsPrimitive.Root.Props) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			data-orientation={orientation}
			orientation={orientation}
			className={cn(
				'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col',
				className
			)}
			{...props}
		/>
	)
}

const tabsListVariants = cva(
	'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-1 text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none',
	{
		variants: {
			variant: {
				default: 'bg-muted',
				line: 'gap-1 bg-transparent',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
)

function TabsList({
	className,
	variant = 'default',
	...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			data-variant={variant}
			className={cn(tabsListVariants({ variant }), className)}
			{...props}
		/>
	)
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
	return (
		<TabsPrimitive.Tab
			data-slot="tabs-trigger"
			className={cn(
				"relative inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent',
				'data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground',
				'after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:-bottom-1 group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100',
				className
			)}
			{...props}
		/>
	)
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
	return (
		<TabsPrimitive.Panel
			data-slot="tabs-content"
			className={cn('flex-1 text-sm outline-none', className)}
			{...props}
		/>
	)
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants }
