import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

/** Storybook is core-react's docs and the `stories` test tier: every story sits beside its component. */
const config: StorybookConfig = {
	stories: ['../src/**/*.stories.tsx'],
	addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
	framework: '@storybook/react-vite',
	core: { disableTelemetry: true },
	viteFinal: (vite) => ({ ...vite, plugins: [...(vite.plugins ?? []), react(), tailwindcss()] }),
}

export default config
