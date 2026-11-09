'use client'

// Vendored from shadcn's base-vega registry (Base UI Toast, not Sonner). Kept close to upstream
// so a re-pull diffs cleanly; the edits (see README → Vendoring):
// - The stacking and swipe geometry is upstream's, written without its element-local variables
//   (`[--gap:0.75rem]`, `[--peek:0.75rem]`, `[--offset-y:…]`, `[--scale:…]`, `[--shrink:…]`,
//   `[--height:…]`): each `transform` reads Base UI's runtime variables (`--toast-index`,
//   `--toast-offset-y`, `--toast-swipe-movement-x/y`, `--toast-frontmost-height`) directly, the
//   gap and peek as `var(--spacing-3)` (0.75rem), and is written `transform-[…]` instead of
//   `[transform:…]`. It stays `transform`, not Tailwind's `translate-*` / `scale-*`: Base UI reads
//   the computed `transform` back when a swipe starts and writes an inline one while it drags.
//   The source scan allows this arithmetic: Base UI variables, spacing variables, unitless
//   numbers and percentages, never a unit.
// - Height reads `--toast-frontmost-height` without upstream's `--toast-height` fallback; both
//   are unset until Base UI has measured the toast, and the height is then `auto`.
// - The default exit and the down-swipe exit are one rule (`--toast-swipe-movement-y` is `0px`
//   without a swipe), and upstream's four `data-expanded:data-ending-style:` copies of the swipe
//   exits are dropped: the swipe variants already out-rank `data-expanded:` on specificity. A
//   left or right swipe keeps the toast's own `translateY`.
// - `[transition:transform_500ms_cubic-bezier(…),opacity_500ms,height_150ms]` is
//   `transition-all duration-500 ease-out` (height animates over 500ms too), and the content's
//   `ease-[cubic-bezier(0.22,1,0.36,1)]` is `ease-out`.
// - `rounded-2xl` is `rounded-xl`, the radius scale's largest step; `ring-[3px]` is `ring-3`.
// - The hover bridge's `after:h-[calc(var(--gap)+1px)]` is `after:h-3.5`; `after:content-['']`
//   is dropped (Tailwind v4's `after:` sets the content itself), on the close button too.
// - The viewport's `z-50` is `z-60`, above Dialog's and Sheet's `z-50` layers. Base UI leaves the
//   viewport out of a modal dialog's `aria-hidden` and outside-press handling (trap 2), but at
//   the same z-index the dialog's later portal painted its backdrop over the toast and swallowed
//   every click on it.
// - The `IconPlaceholder`s are lucide icons under their canonical names (`LoaderCircleIcon`,
//   `TriangleExclamationPointIcon`, not the `Loader2Icon` / `TriangleAlertIcon` aliases).

import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import {
	CircleCheckIcon,
	InfoIcon,
	LoaderCircleIcon,
	OctagonXIcon,
	TriangleExclamationPointIcon,
	XIcon,
} from 'lucide-react'
import * as React from 'react'
import { cn } from '../lib/utils.js'
import { Button } from './button.js'

const toast = ToastPrimitive.createToastManager()

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
	return <ToastPrimitive.Provider {...props} />
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
	return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
	return (
		<ToastPrimitive.Viewport
			data-slot="toast-viewport"
			className={cn(
				'pointer-events-none fixed inset-x-4 bottom-4 z-60 mx-auto w-auto max-w-sm outline-none sm:right-4 sm:left-auto sm:mx-0 sm:w-full',
				className
			)}
			{...props}
		/>
	)
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
	return (
		<ToastPrimitive.Root
			data-slot="toast"
			className={cn(
				'group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-xl border bg-popover text-popover-foreground shadow-lg will-change-transform outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
				'h-(--toast-frontmost-height) transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-var(--toast-index)*var(--spacing-3)-min(1,var(--toast-index)*0.1)*var(--toast-frontmost-height)))_scale(max(0,1-var(--toast-index)*0.1))] transition-all duration-500 ease-out',
				'after:absolute after:top-full after:left-0 after:h-3.5 after:w-full',
				'data-expanded:h-(--toast-height) data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-var(--toast-offset-y)-var(--toast-index)*var(--spacing-3)))]',
				'data-limited:opacity-0 data-starting-style:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))]',
				'[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))]',
				'data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))]',
				'data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(calc(var(--toast-swipe-movement-y)-var(--toast-offset-y)-var(--toast-index)*var(--spacing-3)))]',
				'data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(calc(var(--toast-swipe-movement-y)-var(--toast-offset-y)-var(--toast-index)*var(--spacing-3)))]',
				'data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))]',
				className
			)}
			{...props}
		/>
	)
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
	return (
		<ToastPrimitive.Content
			data-slot="toast-content"
			className={cn(
				'flex h-full items-center gap-3 overflow-hidden p-4 transition-opacity duration-250 ease-out data-behind:opacity-0 data-expanded:opacity-100',
				className
			)}
			{...props}
		/>
	)
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
	return (
		<ToastPrimitive.Title
			data-slot="toast-title"
			className={cn('text-sm font-medium', className)}
			{...props}
		/>
	)
}

function ToastDescription({ className, ...props }: ToastPrimitive.Description.Props) {
	return (
		<ToastPrimitive.Description
			data-slot="toast-description"
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	)
}

function ToastAction({
	className,
	render = <Button variant="outline" size="sm" />,
	...props
}: ToastPrimitive.Action.Props) {
	return (
		<ToastPrimitive.Action
			data-slot="toast-action"
			render={render}
			className={cn('shrink-0', className)}
			{...props}
		/>
	)
}

function ToastClose({
	className,
	children,
	render = <Button variant="ghost" size="icon-sm" />,
	...props
}: ToastPrimitive.Close.Props) {
	return (
		<ToastPrimitive.Close
			data-slot="toast-close"
			aria-label="Close toast"
			render={render}
			className={cn(
				'relative shrink-0 text-muted-foreground after:absolute after:-inset-2 hover:text-foreground',
				className
			)}
			{...props}
		>
			{children ?? <XIcon aria-hidden="true" />}
		</ToastPrimitive.Close>
	)
}

function ToastIcon({ type }: { type: string | undefined }) {
	let icon: React.ReactNode = null

	if (type === 'success') {
		icon = <CircleCheckIcon aria-hidden="true" />
	}

	if (type === 'info') {
		icon = <InfoIcon aria-hidden="true" />
	}

	if (type === 'warning') {
		icon = <TriangleExclamationPointIcon aria-hidden="true" />
	}

	if (type === 'error') {
		icon = <OctagonXIcon className="text-destructive" aria-hidden="true" />
	}

	if (type === 'loading') {
		icon = <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
	}

	if (!icon) {
		return null
	}

	return (
		<span
			data-slot="toast-icon"
			className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
		>
			{icon}
		</span>
	)
}

function ToastList() {
	const { toasts } = ToastPrimitive.useToastManager()

	return toasts.map((toastItem) => (
		<Toast key={toastItem.id} toast={toastItem}>
			<ToastContent>
				<ToastIcon type={toastItem.type} />
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<ToastTitle />
					<ToastDescription />
				</div>
				<ToastAction />
				<ToastClose />
			</ToastContent>
		</Toast>
	))
}

function Toaster({ children, toastManager = toast, ...props }: ToastPrimitive.Provider.Props) {
	return (
		<ToastProvider toastManager={toastManager} {...props}>
			{children}
			<ToastPortal>
				<ToastViewport>
					<ToastList />
				</ToastViewport>
			</ToastPortal>
		</ToastProvider>
	)
}

const createToastManager = ToastPrimitive.createToastManager
const useToastManager = ToastPrimitive.useToastManager

export {
	createToastManager,
	Toast,
	ToastAction,
	ToastClose,
	ToastContent,
	ToastDescription,
	Toaster,
	ToastPortal,
	ToastProvider,
	ToastTitle,
	ToastViewport,
	toast,
	useToastManager,
}
