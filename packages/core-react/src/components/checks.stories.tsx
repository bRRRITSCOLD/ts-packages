import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Checks } from './checks.js'

type State = React.ComponentProps<typeof Checks>['state']

/** The resolved value of a colour token, serialised by the browser as it serialises a computed colour. */
const tokenColour = (canvasElement: HTMLElement, token: string) => {
	const probe = document.createElement('span')
	probe.style.color = getComputedStyle(canvasElement).getPropertyValue(`--${token}`)
	canvasElement.append(probe)
	const colour = getComputedStyle(probe).color
	probe.remove()
	return colour
}

/**
 * Every state is a row of a 14px icon and the label, `gap-1` apart, at `text-xs`, both in the
 * state's colour token. The icon is `aria-hidden`; only `LoaderCircle` spins.
 */
const drawsState =
	(state: State, label: string, icon: string, token: string): Story['play'] =>
	async ({ canvas, canvasElement }) => {
		const checks = canvas.getByText(label)
		await expect(checks).toHaveAttribute('data-slot', 'checks')
		await expect(checks).toHaveAttribute('data-state', state)
		await expect(getComputedStyle(checks).color).toBe(tokenColour(canvasElement, token))
		await expect(getComputedStyle(checks).fontSize).toBe('12px')
		await expect(getComputedStyle(checks).columnGap).toBe('4px')

		const svg = checks.querySelector('svg')
		await expect(svg).toHaveClass(`lucide-${icon}`)
		await expect(svg).toHaveAttribute('aria-hidden', 'true')
		await expect(svg?.getBoundingClientRect().width).toBe(14)
		await expect(getComputedStyle(svg as SVGElement).animationName).toBe(
			icon === 'loader-circle' ? 'spin' : 'none'
		)
	}

/** `title` is the library component's Penpot path; one story per `state`. Children are the label. */
const meta = {
	title: 'Components/Checks',
	component: Checks,
	args: { state: 'success', children: 'passing' },
} satisfies Meta<typeof Checks>

export default meta
type Story = StoryObj<typeof meta>

/** `CircleCheck` in `success`. */
export const Success: Story = {
	args: { state: 'success', children: 'passing' },
	play: drawsState('success', 'passing', 'circle-check', 'success'),
}

/** `LoaderCircle` in `info`, spinning. */
export const Pending: Story = {
	args: { state: 'pending', children: 'running' },
	play: drawsState('pending', 'running', 'loader-circle', 'info'),
}

/** `OctagonX` in `destructive`. */
export const Failure: Story = {
	args: { state: 'failure', children: 'failing' },
	play: drawsState('failure', 'failing', 'octagon-x', 'destructive'),
}

/** With no children it's the icon alone, so the caller names it with `aria-label`. */
export const IconOnly: Story = {
	args: { state: 'success', children: undefined, role: 'img', 'aria-label': 'checks passing' },
	play: async ({ canvas }) => {
		const checks = canvas.getByLabelText('checks passing')
		await expect(checks).toHaveAttribute('data-slot', 'checks')
		await expect(checks.textContent).toBe('')
		await expect(checks.getBoundingClientRect().width).toBe(14)
	},
}
