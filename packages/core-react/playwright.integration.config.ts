// core-react's `integration` tier: Playwright against the static Storybook build that
// `test:integration` makes first (storybook-static/), served by `vite preview`. Each spec opens a
// story by id and drives it through the component objects in src/testing.ts.
import { defineConfig, devices } from '@playwright/test'

const PORT = 6007
const ORIGIN = `http://127.0.0.1:${PORT}`

export default defineConfig({
	testDir: 'tests/integration',
	testMatch: '**/*.integration.spec.ts',
	// A retry hides a real race.
	retries: 0,
	forbidOnly: !!process.env.CI,
	reporter: 'list',
	use: { baseURL: `${ORIGIN}/`, trace: 'retain-on-failure' },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `vite preview --outDir storybook-static --host 127.0.0.1 --port ${PORT} --strictPort`,
		url: `${ORIGIN}/iframe.html`,
		reuseExistingServer: false,
	},
})
