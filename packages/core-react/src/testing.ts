// The `./testing` entry: component objects, the test-side drivers for core-react's components.
// Each is a plain factory over a Playwright `Locator`, with no fixtures; an app registers the
// ones it uses through its own `test.extend`. Methods wait for what they act on; every `expect`
// stays in the spec. `@playwright/test` is an optional peer, imported here for types only.
import type { Locator } from '@playwright/test'

/**
 * Drives a `Dialog` or an `AlertDialog` through its popup, the element with role `dialog` or
 * `alertdialog`. Pass that part as `root`: `page.getByRole('dialog', { name: 'Edit profile' })`,
 * or a testid placed on `DialogContent` (a testid on `Dialog` reaches nothing, as Root renders
 * no DOM).
 *
 * Every lookup goes through `root`: Base UI marks the page under an open dialog `aria-hidden`,
 * not `inert`, so an unscoped lookup can still hit a page-level twin.
 */
export function dialog(root: Locator) {
	return {
		root,

		/** A button inside the dialog, by accessible name. */
		button: (name: string | RegExp) => root.getByRole('button', { name }),

		/** A form control inside the dialog, by its label. */
		field: (label: string | RegExp) => root.getByLabel(label),

		/**
		 * Presses Escape and waits until the dialog is hidden. Escape closes only the top layer,
		 * so this first waits for the dialog to be on top: one covered by a nested dialog is
		 * `aria-hidden`, so a root found by role is hidden until the layers above it close. The
		 * exit animation keeps a closing popup mounted; this returns once it is hidden.
		 */
		dismiss: async () => {
			await root.waitFor({ state: 'visible' })
			await root.page().keyboard.press('Escape')
			await root.waitFor({ state: 'hidden' })
		},
	}
}
