// The `./testing` entry: component objects, the test-side drivers for core-react's components.
// Each is a plain factory over a Playwright `Locator` (`toast` over the `Page`, as toasts are
// portalled to the body), with no fixtures; an app registers the ones it uses through its own
// `test.extend`. Methods wait for what they act on; every `expect` stays in the spec. `@playwright/test` is an optional peer, imported here for types only.
import type { Locator, Page } from '@playwright/test'

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

/**
 * Drives a `Popover` through its popup, the element with role `dialog` named by its
 * `PopoverTitle`. Pass that part as `root`: `page.getByRole('dialog', { name: 'Dimensions' })`,
 * or a testid placed on `PopoverContent`.
 *
 * A popover is non-modal: the page under it stays reachable, so scope lookups to `root` only to
 * reach what is inside it. In a dialog, Escape closes only the popover and leaves the dialog
 * open (Base UI trap 1), as does a click elsewhere in the dialog.
 */
export function popover(root: Locator) {
	return {
		root,

		/** A button inside the popover, by accessible name. */
		button: (name: string | RegExp) => root.getByRole('button', { name }),

		/** A form control inside the popover, by its label. */
		field: (label: string | RegExp) => root.getByLabel(label),

		/**
		 * Presses Escape and waits until the popover is hidden. Escape closes only the top layer:
		 * a dialog the popover was opened from stays open. The exit animation keeps a closing
		 * popup mounted; this returns once it is hidden.
		 */
		dismiss: async () => {
			await root.waitFor({ state: 'visible' })
			await root.page().keyboard.press('Escape')
			await root.waitFor({ state: 'hidden' })
		},
	}
}

/** The listbox a `combobox`-role control opens, found through the control's `aria-controls`. */
const listboxOf = async (control: Locator) => {
	const id = await control.getAttribute('aria-controls')
	if (!id) throw new Error('the control is open but names no listbox in aria-controls')
	return control.page().locator(`id=${id}`)
}

/** Opens a `combobox`-role control unless it is open, and returns its visible listbox. */
const openListbox = async (control: Locator, open: () => Promise<void>) => {
	if ((await control.getAttribute('aria-expanded')) !== 'true') await open()
	await control.and(control.page().getByRole('combobox', { expanded: true })).waitFor()
	const listbox = await listboxOf(control)
	await listbox.waitFor({ state: 'visible' })
	return listbox
}

/** The visible text of each option in a listbox, in order. */
const optionLabels = async (listbox: Locator) =>
	(await listbox.getByRole('option').allInnerTexts()).map((label) => label.trim())

/**
 * Drives a `Select` through its trigger, the element with role `combobox`. Pass that part as
 * `trigger`: `page.getByRole('combobox', { name: 'Fruit' })`, or a testid placed on
 * `SelectTrigger` (a testid on `Select` reaches nothing, as Root renders no DOM).
 *
 * A select keeps its value in a hidden input: never `fill()` it (Base UI trap 6). Open the
 * trigger and pick the option, as `select(label)` does. The popup is portalled; it is found
 * through the trigger's `aria-controls`, so lookups stay scoped to this select. The popup puts a
 * backdrop over the page, so in a dialog Escape or a click outside closes only the select
 * (Base UI trap 1).
 */
export function select(trigger: Locator) {
	const open = () => openListbox(trigger, () => trigger.click())

	return {
		trigger,

		/** Opens the select and returns its listbox. */
		open,

		/** Opens the select and reads its options' labels, in order. */
		options: async () => optionLabels(await open()),

		/** Opens the select, picks the option with this label, and waits for the popup to close. */
		select: async (label: string) => {
			const listbox = await open()
			await listbox.getByRole('option', { name: label, exact: true }).click()
			await listbox.waitFor({ state: 'hidden' })
		},

		/** The label the trigger shows: the picked option's, or the placeholder. */
		value: async () => (await trigger.innerText()).trim(),

		/** Presses Escape and waits until the popup is hidden; a dialog under it stays open. */
		dismiss: async () => {
			const listbox = await open()
			await trigger.page().keyboard.press('Escape')
			await listbox.waitFor({ state: 'hidden' })
		},
	}
}

/**
 * Drives a `Combobox` through its input, the element with role `combobox`. Pass that part as
 * `input`: `page.getByRole('combobox', { name: 'Framework' })`, or a testid placed on
 * `ComboboxInput` / `ComboboxChipsInput`.
 *
 * Options carry no value attribute (Base UI trap 4): find and filter them by label. Picking one
 * closes the popup and, in `multiple`, clears the filter (Base UI's default, kept), so
 * `select(...labels)` filters to each label and picks it, reopening the popup every time. The
 * popup is portalled and found through the input's `aria-controls`. In a dialog, Escape or a
 * click elsewhere in the dialog closes only the popup (Base UI trap 1).
 */
export function combobox(input: Locator) {
	const open = () => openListbox(input, () => input.press('ArrowDown'))
	const chips = input.page().getByRole('toolbar').filter({ has: input })

	return {
		input,

		/** Opens the popup and returns its listbox. */
		open,

		/** Types `text` as the filter and returns the open listbox. */
		filter: async (text: string) => {
			await input.fill(text)
			return open()
		},

		/** Opens the popup and reads the labels of the options the filter leaves, in order. */
		options: async () => optionLabels(await open()),

		/**
		 * Picks each option by label, in order: filters to the label, clicks its option and waits
		 * for the popup to close. In `multiple`, each pick adds a chip.
		 */
		select: async (...labels: string[]) => {
			for (const label of labels) {
				await input.fill(label)
				const listbox = await open()
				await listbox.getByRole('option', { name: label, exact: true }).click()
				await listbox.waitFor({ state: 'hidden' })
			}
		},

		/** The input's text: the picked label in single mode, the filter in `multiple`. */
		value: () => input.inputValue(),

		/** In `multiple`, the label of each chip, in order. */
		chips: async () => {
			await chips.waitFor()
			return chips.evaluate((toolbar) =>
				[...toolbar.children]
					.filter((child) => child.tagName !== 'INPUT')
					.map((chip) => chip.textContent?.trim() ?? '')
			)
		},

		/** Presses Escape and waits until the popup is hidden; a dialog under it stays open. */
		dismiss: async () => {
			const listbox = await open()
			await input.press('Escape')
			await listbox.waitFor({ state: 'hidden' })
		},
	}
}

/** A toast's priority: Base UI's `low` (the default, role `dialog`) or `high` (role `alertdialog`). */
export type ToastPriority = 'low' | 'high'

/**
 * Drives the toasts `Toaster` shows, from the page: they render in the `region` named
 * "Notifications", portalled to the body. Find a toast by its text and read its priority; never
 * by an unscoped `getByRole('dialog')`, which also matches every toast (Base UI trap 3).
 *
 * Base UI trap 3: a low-priority toast is a `dialog`. A high-priority one is an `alertdialog`,
 * `aria-hidden` until the viewport gets focus (F6 or a Tab into it), and a separate visually
 * hidden `role="alert"` outside the region announces its title and description meanwhile. Every
 * lookup here includes hidden elements, so both priorities are found the same way. The close
 * button is `aria-hidden` too until the stack expands on hover or the button gets focus.
 *
 * The region is never marked `aria-hidden` by an open dialog (Base UI trap 2 exempts it), so a
 * toast shown from a dialog is found the same way. A closing toast stays mounted through its exit
 * animation (trap 5); `close()` and `waitForHidden()` return once it is hidden.
 */
export function toast(page: Page) {
	const region = page.getByRole('region', { name: 'Notifications' })
	const toasts = region
		.getByRole('dialog', { includeHidden: true })
		.or(region.getByRole('alertdialog', { includeHidden: true }))

	/** The toast whose title or description contains `text`. */
	const get = (text: string | RegExp) => toasts.filter({ hasText: text })

	return {
		region,

		/** The toast whose title or description contains `text`. */
		get,

		/** The title of every toast on screen, newest first. Waits for at least one. */
		titles: async () => {
			await toasts.first().waitFor()
			return toasts.evaluateAll((all) =>
				all.map((el) => {
					const title = el.ownerDocument.getElementById(
						el.getAttribute('aria-labelledby') ?? ''
					)
					return title?.textContent?.trim() ?? ''
				})
			)
		},

		/**
		 * Reads the toast with this text: its title and description (the elements its
		 * `aria-labelledby` and `aria-describedby` name; `''` without one) and its priority, from
		 * its role. Waits for the toast.
		 */
		read: async (text: string | RegExp) => {
			const shown = get(text)
			await shown.waitFor()
			return shown.evaluate((el) => {
				const named = (attribute: string) =>
					el.ownerDocument
						.getElementById(el.getAttribute(attribute) ?? '')
						?.textContent?.trim() ?? ''
				const priority: ToastPriority =
					el.getAttribute('role') === 'alertdialog' ? 'high' : 'low'
				return {
					title: named('aria-labelledby'),
					description: named('aria-describedby'),
					priority,
				}
			})
		},

		/**
		 * The visually hidden `role="alert"` that announces a high-priority toast with this text
		 * while the viewport is unfocused. Base UI removes it once the viewport gets focus.
		 */
		announcer: (text: string | RegExp) => page.getByRole('alert').filter({ hasText: text }),

		/** A button inside the toast with this text: its action, by accessible name. */
		button: (text: string | RegExp, name: string | RegExp) =>
			get(text).getByRole('button', { name, includeHidden: true }),

		/**
		 * Hovers the toast with this text, which expands the stack and un-hides its close button,
		 * clicks the button and waits until the toast is hidden.
		 */
		close: async (text: string | RegExp) => {
			const shown = get(text)
			await shown.hover()
			await shown.getByRole('button', { name: 'Close toast', includeHidden: true }).click()
			await shown.waitFor({ state: 'hidden' })
		},

		/** Waits until the toast with this text is hidden: closed, timed out or swiped away. */
		waitForHidden: (text: string | RegExp) => get(text).waitFor({ state: 'hidden' }),
	}
}
