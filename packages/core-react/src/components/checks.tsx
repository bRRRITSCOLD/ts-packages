// Ours, not vendored: shadcn has no checks rollup (promotion #156). Written in Badge's style.
// A PR's checks as a 14px icon and the caller's label, both in the state's colour token.
// `pending`'s `LoaderCircle` spins, as Toast's loading icon does; the library twin can't.
import { cva, type VariantProps } from 'class-variance-authority'
import { CircleCheckIcon, LoaderCircleIcon, OctagonXIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '../lib/utils.js'

const checksVariants = cva('inline-flex items-center gap-1 text-xs', {
	variants: {
		state: {
			success: 'text-success',
			pending: 'text-info',
			failure: 'text-destructive',
		},
	},
})

type ChecksState = NonNullable<VariantProps<typeof checksVariants>['state']>

const icons: Record<ChecksState, React.ReactNode> = {
	success: <CircleCheckIcon className="size-3.5" aria-hidden="true" />,
	pending: <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden="true" />,
	failure: <OctagonXIcon className="size-3.5" aria-hidden="true" />,
}

/**
 * Children are the label. With none it's the icon alone: name it with `role="img"` and an
 * `aria-label`, as a `<span>` with no role can't carry a label.
 */
function Checks({
	className,
	state,
	children,
	...props
}: React.ComponentProps<'span'> & { state: ChecksState }) {
	return (
		<span
			data-slot="checks"
			data-state={state}
			className={cn(checksVariants({ state }), className)}
			{...props}
		>
			{icons[state]}
			{children}
		</span>
	)
}

export { Checks, checksVariants }
