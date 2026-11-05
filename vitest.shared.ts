/**
 * The Vitest config every package's `vitest.config.ts` builds on.
 *
 * One project per test tier, selected by file suffix, so `test:<tier>` is
 * `vitest run --project <tier>` and `test:<tier>:watch` is `vitest --project <tier>`.
 * Paths resolve against the package directory, which is the cwd of every package
 * script. Tests import `describe`, `it`, `expect`, `vi` and the hooks from `vitest`;
 * there are no globals.
 */

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/** Integration and e2e wait on containers and deployed services, so they get far longer than unit's 5 s default. */
const SLOW_TIER_TIMEOUT_MS = 120_000

export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					include: ['tests/**/*.unit.test.ts'],
				},
			},
			{
				extends: true,
				test: {
					name: 'integration',
					include: ['tests/**/*.integration.test.ts'],
					setupFiles: [
						fileURLToPath(new URL('./vitest.integration.setup.ts', import.meta.url)),
					],
					testTimeout: SLOW_TIER_TIMEOUT_MS,
					hookTimeout: SLOW_TIER_TIMEOUT_MS,
				},
			},
			{
				extends: true,
				test: {
					name: 'e2e',
					include: ['tests/**/*.e2e.test.ts'],
					testTimeout: SLOW_TIER_TIMEOUT_MS,
					hookTimeout: SLOW_TIER_TIMEOUT_MS,
				},
			},
		],
	},
})
