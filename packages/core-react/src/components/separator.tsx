'use client'

// Vendored from shadcn's base-vega registry (Base UI). Kept close to upstream so a re-pull diffs
// cleanly; the only edit (see README → Vendoring): upstream's `data-horizontal:` / `data-vertical:`
// are `data-[orientation=horizontal]:` / `data-[orientation=vertical]:`, the attribute Base UI
// 1.9's Separator sets. Upstream's never match it, leaving the line 0px tall.

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'
import { cn } from '../lib/utils.js'

function Separator({ className, orientation = 'horizontal', ...props }: SeparatorPrimitive.Props) {
	return (
		<SeparatorPrimitive
			data-slot="separator"
			orientation={orientation}
			className={cn(
				'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch',
				className
			)}
			{...props}
		/>
	)
}

export { Separator }
