// Vendored from shadcn's base-vega registry (Base UI Accordion). Kept close to upstream so a
// re-pull diffs cleanly (see README → Vendoring). Upstream has no "use client" and neither does
// this file. The trigger's `aria-disabled:` is `disabled:`: Base UI 1.9 renders the trigger as a
// native button and disables it with the `disabled` attribute, so a disabled item never dimmed. The
// panel's height animation moves onto the panel: upstream put `h-(--accordion-panel-height)` and
// `data-starting-style:h-0` / `data-ending-style:h-0` on the inner div, which carries none of Base
// UI's attributes, and animated the panel with tw-animate-css's `animate-accordion-down/up`, whose
// keyframes read Radix's `--radix-accordion-content-height`, not Base UI's, so the height jumped.
// The panel now transitions its own height between 0 and `--accordion-panel-height`.
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { cn } from '../lib/utils.js'

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
	return (
		<AccordionPrimitive.Root
			data-slot="accordion"
			className={cn('flex w-full flex-col', className)}
			{...props}
		/>
	)
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
	return (
		<AccordionPrimitive.Item
			data-slot="accordion-item"
			className={cn('not-last:border-b', className)}
			{...props}
		/>
	)
}

function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
	return (
		<AccordionPrimitive.Header className="flex">
			<AccordionPrimitive.Trigger
				data-slot="accordion-trigger"
				className={cn(
					'group/accordion-trigger relative flex flex-1 items-start justify-between rounded-md border border-transparent py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground',
					className
				)}
				{...props}
			>
				{children}
				<ChevronDownIcon
					data-slot="accordion-trigger-icon"
					className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
				/>
				<ChevronUpIcon
					data-slot="accordion-trigger-icon"
					className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
				/>
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	)
}

function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
	return (
		<AccordionPrimitive.Panel
			data-slot="accordion-content"
			className="h-(--accordion-panel-height) overflow-hidden text-sm transition-all duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0"
			{...props}
		>
			<div
				className={cn(
					'pt-0 pb-4 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4',
					className
				)}
			>
				{children}
			</div>
		</AccordionPrimitive.Panel>
	)
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
