import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { StateDot } from './state-dot.js'

type State = React.ComponentProps<typeof StateDot>['state']

/** The 16px mark a state draws: a lucide icon, or `dot` for the 8px dot. */
type Mark = 'dot' | 'loader-circle' | 'circle-check' | 'circle' | 'x' | 'octagon-x'

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
 * Every state is a 16px box centring its mark in the state's colour token. An icon is 16px and
 * `aria-hidden`; the dot is 8px, round and filled with the same colour. Only `LoaderCircle` spins.
 */
const drawsMark =
	(state: State, mark: Mark, token: string): Story['play'] =>
	async ({ canvas, canvasElement }) => {
		const dot = canvas.getByLabelText(state)
		await expect(dot).toHaveAttribute('data-slot', 'state-dot')
		await expect(dot).toHaveAttribute('data-state', state)
		await expect(dot.getBoundingClientRect().width).toBe(16)
		await expect(dot.getBoundingClientRect().height).toBe(16)
		await expect(getComputedStyle(dot).color).toBe(tokenColour(canvasElement, token))

		const svg = dot.querySelector('svg')
		if (mark === 'dot') {
			await expect(svg).toBeNull()
			const fill = dot.firstElementChild as HTMLElement
			await expect(fill.getBoundingClientRect().width).toBe(8)
			await expect(fill.getBoundingClientRect().height).toBe(8)
			await expect(getComputedStyle(fill).borderTopLeftRadius).toBe('9999px')
			await expect(getComputedStyle(fill).backgroundColor).toBe(getComputedStyle(dot).color)
			return
		}
		await expect(svg).toHaveClass(`lucide-${mark}`)
		await expect(svg).toHaveAttribute('aria-hidden', 'true')
		await expect(svg?.getBoundingClientRect().width).toBe(16)
		await expect(getComputedStyle(svg as SVGElement).animationName).toBe(
			mark === 'loader-circle' ? 'spin' : 'none'
		)
	}

/**
 * `title` is the library component's Penpot path; one story per `state`. Nothing visible names
 * the state, so each story names it as a caller does: `role="img"` with an `aria-label` (axe
 * rejects an `aria-label` on a `<span>` with no role).
 */
const meta = {
	title: 'Components/StateDot',
	component: StateDot,
	args: { state: 'working', role: 'img', 'aria-label': 'working' },
} satisfies Meta<typeof StateDot>

export default meta
type Story = StoryObj<typeof meta>

/** `LoaderCircle` in `info`, spinning. */
export const Working: Story = {
	args: { state: 'working', 'aria-label': 'working' },
	play: drawsMark('working', 'loader-circle', 'info'),
}

/** The dot in `destructive`. */
export const Blocked: Story = {
	args: { state: 'blocked', 'aria-label': 'blocked' },
	play: drawsMark('blocked', 'dot', 'destructive'),
}

/** `CircleCheck` in `success`. */
export const Done: Story = {
	args: { state: 'done', 'aria-label': 'done' },
	play: drawsMark('done', 'circle-check', 'success'),
}

/** The dot in `muted-foreground`. */
export const Idle: Story = {
	args: { state: 'idle', 'aria-label': 'idle' },
	play: drawsMark('idle', 'dot', 'muted-foreground'),
}

/** `Circle` in `muted-foreground`. */
export const Unknown: Story = {
	args: { state: 'unknown', 'aria-label': 'unknown' },
	play: drawsMark('unknown', 'circle', 'muted-foreground'),
}

/** `X` in `muted-foreground`: exit code 0, or none read. */
export const Exited: Story = {
	args: { state: 'exited', 'aria-label': 'exited' },
	play: drawsMark('exited', 'x', 'muted-foreground'),
}

/** `OctagonX` in `destructive`: any other exit code. Its shape tells it from `blocked`. */
export const ExitedError: Story = {
	args: { state: 'exited-error', 'aria-label': 'exited-error' },
	play: drawsMark('exited-error', 'octagon-x', 'destructive'),
}
