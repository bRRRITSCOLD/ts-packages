// Vendored from shadcn's base-vega registry. Kept close to upstream so a re-pull diffs cleanly; the
// edits put arbitrary values back on tokens (see README → Vendoring). Upstream spaced every part
// with an element-local `--card-spacing` (`[--card-spacing:--spacing(6)]`, `gap-(--card-spacing)`,
// `px-(--card-spacing)`), and `--spacing(…)` reads Tailwind's `--spacing`, which the theme clears,
// so the card had no padding or gaps at all. Each use is written out as the step it means, `6`
// (24px) and at `size` sm `4` (16px): `gap-6 py-6`, `px-6`, the ruled header's `pb-6` and footer's
// `pt-6`, each with its `data-[size=sm]` / `group-data-[size=sm]/card:` twin. The header's
// `has-data-[slot=card-action]:grid-cols-[1fr_auto]` and
// `has-data-[slot=card-description]:grid-rows-[auto_auto]` are dropped: the action's `col-start-2
// row-span-2 justify-self-end` already makes the implicit tracks, and its column holds no more than
// the action, so it still ends at the header's right edge.
import * as React from 'react'
import { cn } from '../lib/utils.js'

function Card({
	className,
	size = 'default',
	...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
	return (
		<div
			data-slot="card"
			data-size={size}
			className={cn(
				'group/card flex flex-col gap-6 overflow-hidden rounded-xl bg-card py-6 text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10 has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
				className
			)}
			{...props}
		/>
	)
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-6 group-data-[size=sm]/card:px-4 [.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4',
				className
			)}
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-title"
			className={cn(
				'text-base leading-normal font-medium group-data-[size=sm]/card:text-sm',
				className
			)}
			{...props}
		/>
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-description"
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	)
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-action"
			className={cn(
				'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				className
			)}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-content"
			className={cn('flex flex-col gap-3 px-6 group-data-[size=sm]/card:px-4', className)}
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-footer"
			className={cn(
				'flex items-center rounded-b-xl px-6 group-data-[size=sm]/card:px-4 [.border-t]:pt-6 group-data-[size=sm]/card:[.border-t]:pt-4',
				className
			)}
			{...props}
		/>
	)
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
