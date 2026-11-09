// Vendored from shadcn's base-vega registry, unchanged: every class is on tokens.
import { cn } from '../lib/utils.js'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="skeleton"
			className={cn('animate-pulse rounded-md bg-muted', className)}
			{...props}
		/>
	)
}

export { Skeleton }
