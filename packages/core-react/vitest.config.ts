// core-react's tiers depart from ../../vitest.shared.ts (see README → Tests): `unit` runs on
// jsdom and takes .tsx; `stories` runs every story, play function and a11y check in Chromium;
// `integration` is Playwright against a static Storybook build.
import { join } from 'node:path'

// node_modules
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: 'unit',
					include: ['tests/unit/**/*.unit.test.{ts,tsx}'],
					environment: 'jsdom',
				},
			},
			{
				plugins: [storybookTest({ configDir: join(import.meta.dirname, '.storybook') })],
				test: {
					name: 'stories',
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
		],
	},
})
