import type { Meta, StoryObj } from '@storybook/react-vite'
import type * as React from 'react'
import { expect, fn, waitFor } from 'storybook/test'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion.js'

const ITEMS = [
	{
		value: 'shipping',
		question: 'What are your shipping options?',
		answer: 'Standard shipping takes three to five days; express arrives the next working day.',
	},
	{
		value: 'returns',
		question: 'What is your return policy?',
		answer: 'Return any unused item within 30 days for a full refund.',
	},
	{
		value: 'support',
		question: 'How do I reach support?',
		answer: 'Write to us any time; we answer within one working day.',
	},
]

/** The FAQ every story renders; `disabledItem` disables one item rather than the whole root. */
function FaqAccordion({
	disabledItem,
	...props
}: React.ComponentProps<typeof Accordion> & { disabledItem?: string }) {
	return (
		<Accordion data-testid="faq" {...props} className="max-w-md">
			{ITEMS.map(({ value, question, answer }) => (
				<AccordionItem
					key={value}
					value={value}
					disabled={value === disabledItem}
					data-testid="item"
				>
					<AccordionTrigger>{question}</AccordionTrigger>
					<AccordionContent>{answer}</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	)
}

/**
 * `title` is the library component's Penpot path. Each item is a trigger button (in an `h3`) and
 * a panel with role `region` named by its trigger. One item opens at a time unless `multiple`;
 * a closed panel is unmounted once its exit animation ends. Each trigger is its own tab stop:
 * Base UI 1.9 has no roving focus, so the arrow keys do nothing.
 */
const meta = {
	title: 'Components/Accordion',
	component: Accordion,
	args: { onValueChange: fn() },
	render: (args) => <FaqAccordion {...args} />,
	play: async ({ args, canvas, userEvent }) => {
		const shipping = canvas.getByRole('button', { name: ITEMS[0]?.question })
		await expect(shipping).toHaveAttribute('aria-expanded', 'false')
		await userEvent.click(shipping)
		await expect(shipping).toHaveAttribute('aria-expanded', 'true')
		await expect(args.onValueChange).toHaveBeenLastCalledWith(['shipping'], expect.anything())
		const panel = await canvas.findByRole('region', { name: ITEMS[0]?.question })
		await expect(panel).toHaveTextContent(ITEMS[0]?.answer ?? '')
	},
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Opening an item closes the one open before. The open panel animates to its content's height
 * (Base UI's `--accordion-panel-height`) and the chevron flips up.
 */
export const Default: Story = {
	play: async (context) => {
		await meta.play(context)
		const { canvas, userEvent } = context
		const panel = canvas.getByRole('region', { name: ITEMS[0]?.question })
		const body = panel.firstElementChild as HTMLElement
		await waitFor(() =>
			expect(panel.getBoundingClientRect().height).toBe(body.getBoundingClientRect().height)
		)
		// The content's pb-4 is the only space under the text.
		await expect(getComputedStyle(body).paddingBottom).toBe('16px')
		const shipping = canvas.getByRole('button', { name: ITEMS[0]?.question })
		const [down, up] = shipping.querySelectorAll('svg')
		await expect(getComputedStyle(down as Element).display).toBe('none')
		await expect(getComputedStyle(up as Element).display).not.toBe('none')

		await userEvent.click(canvas.getByRole('button', { name: ITEMS[1]?.question }))
		await expect(shipping).toHaveAttribute('aria-expanded', 'false')
		await waitFor(() =>
			expect(
				canvas.queryByRole('region', { name: ITEMS[0]?.question })
			).not.toBeInTheDocument()
		)
	},
}

/** `multiple` keeps every opened item open. */
export const Multiple: Story = {
	args: { multiple: true },
	play: async (context) => {
		await meta.play(context)
		const { args, canvas, userEvent } = context
		await userEvent.click(canvas.getByRole('button', { name: ITEMS[1]?.question }))
		await expect(args.onValueChange).toHaveBeenLastCalledWith(
			['shipping', 'returns'],
			expect.anything()
		)
		await expect(canvas.getAllByRole('region')).toHaveLength(2)
	},
}

/** A disabled item's trigger is a disabled button at half opacity; Tab skips it. */
export const DisabledItem: Story = {
	render: (args) => <FaqAccordion {...args} disabledItem="support" />,
	play: async ({ canvas }) => {
		const support = canvas.getByRole('button', { name: ITEMS[2]?.question })
		await expect(support).toBeDisabled()
		await expect(getComputedStyle(support).opacity).toBe('0.5')
		// pointer-events-none stops a pointer reaching it; a scripted click is ignored too.
		support.click()
		await expect(support).toHaveAttribute('aria-expanded', 'false')
	},
}

/** Items are separated by a 1px `border` rule; the last item has none. */
export const Dividers: Story = {
	play: async ({ canvas }) => {
		const items = canvas.getAllByTestId('item')
		await expect(getComputedStyle(items[0] as Element).borderBottomWidth).toBe('1px')
		await expect(getComputedStyle(items.at(-1) as Element).borderBottomWidth).toBe('0px')
	},
}
