// node_modules
import type { Page } from '@playwright/test'

type StorybookWindow = { __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } } }

/** The render phases a story ends in: `finished` once its play function has passed. */
const SETTLED = ['finished', 'errored', 'aborted']

/**
 * Opens a story of the static build by id and waits until Storybook has finished rendering it.
 * Storybook runs the story's `play` function on load, so a spec starts from the state `play`
 * leaves and never races it.
 */
export async function openStory(page: Page, id: string): Promise<void> {
	await page.goto(`iframe.html?id=${id}&viewMode=story`)
	const settled = await page.waitForFunction((phases) => {
		const phase = (window as StorybookWindow).__STORYBOOK_PREVIEW__?.currentRender?.phase
		return phase && phases.includes(phase) ? phase : undefined
	}, SETTLED)
	const phase = await settled.jsonValue()
	if (phase !== 'finished')
		throw new Error(`story ${id} ended ${phase}: its play function fails; run test:stories`)
}
