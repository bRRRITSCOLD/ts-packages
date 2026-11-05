import type { Preview } from '@storybook/react-vite'

import './preview.css'

/** Dark mode is the `.dark` class on an ancestor, as in an app; the toolbar toggles it on <html>. */
const preview: Preview = {
	tags: ['autodocs'],
	parameters: {
		// An accessibility violation fails the story's test. A story that opts out with
		// `a11y: { test: 'off' }` says why in a comment beside it.
		a11y: { test: 'error' },
	},
	globalTypes: {
		theme: {
			description: 'Colour mode',
			toolbar: {
				icon: 'mirror',
				items: [
					{ value: 'light', title: 'Light' },
					{ value: 'dark', title: 'Dark' },
				],
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: { theme: 'light' },
	decorators: [
		(Story, { globals }) => {
			document.documentElement.classList.toggle('dark', globals.theme === 'dark')
			return Story()
		},
	],
}

export default preview
