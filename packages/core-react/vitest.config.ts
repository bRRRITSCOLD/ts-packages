// core-react's tiers depart from ../../vitest.shared.ts (see README → Tests): `unit` runs on
// jsdom and takes .tsx; `stories` runs every story in a browser; `integration` is Playwright.
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
		],
	},
})
