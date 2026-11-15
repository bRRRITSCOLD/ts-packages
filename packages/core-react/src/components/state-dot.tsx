// Ours, not vendored: shadcn has no status mark (promotion #156). Written in Badge's style.
// An agent's state as a 16px mark: a lucide icon, or an 8px dot, in the state's colour token.
// `working`'s `LoaderCircle` spins, as Toast's loading icon does; the library twin can't.
import { cva, type VariantProps } from 'class-variance-authority'
import { CircleCheckIcon, CircleIcon, LoaderCircleIcon, OctagonXIcon, XIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '../lib/utils.js'

const stateDotVariants = cva('inline-flex size-4 shrink-0 items-center justify-center', {
	variants: {
		state: {
			working: 'text-info',
			blocked: 'text-destructive',
			done: 'text-success',
			idle: 'text-muted-foreground',
			unknown: 'text-muted-foreground',
			exited: 'text-muted-foreground',
			'exited-error': 'text-destructive',
		},
	},
})

type StateDotState = NonNullable<VariantProps<typeof stateDotVariants>['state']>

const dot = <span className="size-2 rounded-full bg-current" />

const marks: Record<StateDotState, React.ReactNode> = {
	working: <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />,
	blocked: dot,
	done: <CircleCheckIcon className="size-4" aria-hidden="true" />,
	idle: dot,
	unknown: <CircleIcon className="size-4" aria-hidden="true" />,
	exited: <XIcon className="size-4" aria-hidden="true" />,
	'exited-error': <OctagonXIcon className="size-4" aria-hidden="true" />,
}

/**
 * Nothing visible names the state. Where no text beside it does, pass `role="img"` and an
 * `aria-label`: a `<span>` with no role can't carry a label.
 */
function StateDot({
	className,
	state,
	...props
}: React.ComponentProps<'span'> & { state: StateDotState }) {
	return (
		<span
			data-slot="state-dot"
			data-state={state}
			className={cn(stateDotVariants({ state }), className)}
			{...props}
		>
			{marks[state]}
		</span>
	)
}

export { StateDot, stateDotVariants }
