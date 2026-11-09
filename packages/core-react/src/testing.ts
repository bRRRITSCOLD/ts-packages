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

/**
 * Drives a `ToggleGroup` through its root, the element with role `group`. Pass that part as
 * `root`: `page.getByRole('group', { name: 'Text alignment' })` (give the group an `aria-label`),
 * or a testid placed on `ToggleGroup`.
 *
 * Its items are toggle buttons, `aria-pressed`, even when the group holds one value: there is no
 * `radio` to find and no `aria-checked` to read. Find an item by its label, as `item(label)` does;
 * `pressed()` reads which are pressed. The group is one tab stop with arrow keys between items,
 * so a keyboard spec tabs to the group once and arrows from there.
 */
export function toggleGroup(root: Locator) {
	const item = (label: string) => root.getByRole('button', { name: label, exact: true })

	/** Clicks the item unless it is already in the state wanted, then waits for that state. */
	const set = async (label: string, pressed: boolean) => {
		const target = item(label)
		if ((await target.getAttribute('aria-pressed')) !== String(pressed)) await target.click()
		await root
			.getByRole('button', { name: label, exact: true, pressed })
			.waitFor({ state: 'visible' })
	}

	return {
		root,

		/** An item, by its accessible name. */
		item,

		/** The labels of the pressed items, in order. */
		pressed: async () => {
			await root.waitFor({ state: 'visible' })
			return root
				.getByRole('button', { pressed: true })
				.evaluateAll((items) =>
					items.map((el) => el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '')
				)
		},

		/** Presses an item; in a single-value group this releases the one pressed before. */
		press: (label: string) => set(label, true),

		/** Releases a pressed item; a single-value group is then left with nothing pressed. */
		release: (label: string) => set(label, false),
	}
}

/**
 * Drives an `Accordion` through its root. The root has no role: pass a testid placed on
 * `Accordion` (`page.getByTestId('faq')`) or a locator scoped to the section holding it.
 *
 * Each item is a trigger button, named by its text, and a panel with role `region` named by its
 * trigger. A closed panel is unmounted, not hidden, once its height animation ends (Base UI trap
 * 5): `close()` returns after that, and a closed item's panel has nothing to read. Opening an item
 * of a single-value accordion closes the one open before. A disabled item's trigger is a native
 * disabled button that ignores the pointer, so `open()` and `close()` throw rather than wait on
 * it. Each trigger is its own tab stop: Base UI 1.9 dropped the accordion's roving focus, so the
 * arrow keys do nothing and Tab moves between triggers (skipping a disabled one). Enter or Space
 * toggles the focused trigger.
 */
export function accordion(root: Locator) {
	const trigger = (label: string) => root.getByRole('button', { name: label, exact: true })
	const panel = (label: string) => root.getByRole('region', { name: label, exact: true })

	/** Clicks the trigger unless the item is already in the state wanted, then waits for its panel. */
	const set = async (label: string, open: boolean) => {
		const target = trigger(label)
		if (await target.isDisabled()) throw new Error(`accordion item "${label}" is disabled`)
		if ((await target.getAttribute('aria-expanded')) !== String(open)) await target.click()
		await panel(label).waitFor({ state: open ? 'visible' : 'detached' })
	}

	return {
		root,

		/** An item's trigger, by its text. */
		trigger,

		/** An open item's panel, by its trigger's text; a closed item has none. */
		panel,

		/** The labels of the open items, in order. */
		expanded: async () => {
			await root.waitFor({ state: 'visible' })
			return root
				.getByRole('button', { expanded: true })
				.evaluateAll((items) => items.map((el) => el.textContent?.trim() ?? ''))
		},

		/** Opens an item and waits for its panel; in a single-value accordion this closes the other. */
		open: (label: string) => set(label, true),

		/** Closes an item and waits until its panel has animated out and unmounted. */
		close: (label: string) => set(label, false),
	}
}

/**
 * Drives `Tabs` through its root, which holds the `tablist` and the panels. The root has no role:
 * pass a testid placed on `Tabs` (`page.getByTestId('settings')`) or a locator scoped to the
 * section holding it.
 *
 * Only the selected tab's panel is mounted, but for a moment after a switch the panel being left
 * is still there beside the new one, so `panel(label)` finds a panel by the tab that names it,
 * never as the only `tabpanel`. The arrow keys move focus between tabs without selecting (Base UI's
 * `activateOnFocus` is off): Enter or Space selects the focused tab. A disabled tab stays
 * focusable (`aria-disabled`) and ignores the pointer, so `select()` throws rather than wait on it.
 */
export function tabs(root: Locator) {
	const tab = (label: string) => root.getByRole('tab', { name: label, exact: true })

	/** The selected tab's label. */
	const selected = async () => {
		const active = root.getByRole('tab', { selected: true })
		await active.waitFor({ state: 'visible' })
		return (await active.textContent())?.trim() ?? ''
	}

	return {
		root,

		/** A tab, by its label. */
		tab,

		selected,

		/** A tab's panel, named by the tab; mounted only while that tab is selected. */
		panel: (label: string) => root.getByRole('tabpanel', { name: label, exact: true }),

		/** Selects a tab and waits until it is selected. */
		select: async (label: string) => {
			const target = tab(label)
			if ((await target.getAttribute('aria-disabled')) === 'true')
				throw new Error(`tab "${label}" is disabled`)
			await target.click()
			await root.getByRole('tab', { name: label, exact: true, selected: true }).waitFor()
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

/** A data table column's sort order, as `DataTableColumnHeader` takes it. */
export type DataTableSortOrder = 'none' | 'asc' | 'desc'

const SORT_LABEL: Record<DataTableSortOrder, string> = { none: 'None', asc: 'Asc', desc: 'Desc' }
const SORT_OF: Record<string, DataTableSortOrder> = { ascending: 'asc', descending: 'desc' }

/** Opens a menu from its trigger unless it is open, and returns its portalled popup. */
const openMenu = async (trigger: Locator) => {
	if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click()
	// Base UI names the popup in aria-controls only once it has mounted.
	await trigger.and(trigger.page().getByRole('button', { expanded: true })).waitFor()
	const id = await trigger.getAttribute('aria-controls')
	if (!id) throw new Error('the menu trigger names no popup in aria-controls')
	const menu = trigger.page().locator(`id=${id}`)
	await menu.waitFor({ state: 'visible' })
	return menu
}

/**
 * Drives a data table: `Table` with `DataTableColumnHeader`s, a `DataTableToolbar` (with
 * `DataTableViewOptions`) and a `DataTablePagination`, as `useDataTable` wires them. The parts
 * have no common role: pass a testid placed on the element holding them all
 * (`page.getByTestId('payments')`) or a locator scoped to the section holding it.
 *
 * - **`aria-sort` is on the header cell**, the `columnheader`, not on its sort button, and only on
 *   the sorted column: an unsorted column has none, which `sort()` reads as `none`.
 * - **The header and View menus are portalled** outside `root`: each is found through its
 *   trigger's `aria-controls`. A sort pick closes its menu; a View checkbox item keeps it open,
 *   so `toggleColumn()` closes it with Escape. Both wait out the exit animation (Base UI trap 5).
 * - **Pagination's pages are buttons, not links**: Base UI renders them as `<a role="button">`.
 *   The current page is `aria-current="page"`, not `pressed` or `selected`. Previous on the
 *   first page and Next on the last are `aria-disabled` and ignore the pointer, so
 *   `previousPage()` / `nextPage()` throw rather than wait on them.
 * - **A checkbox is Base UI's `<span role="checkbox">`** (Base UI trap 6's hidden input sits
 *   beside it): click the role, never `check()` the input. Select-all reads `mixed` when some rows
 *   of the page are picked.
 * - A filter goes back to the first page; a page shows only its rows, so `rows()` reads one page.
 */
export function dataTable(root: Locator) {
	const table = root.getByRole('table')
	const body = table.locator('tbody')
	const pagination = root.getByRole('navigation', { name: 'pagination' })

	/** A column's header cell, by its label. */
	const header = (column: string) =>
		table.getByRole('columnheader', { name: column, exact: true })

	/** The body row whose text contains `text`. */
	const row = (text: string | RegExp) => body.getByRole('row').filter({ hasText: text })

	/** The labels of the header cells, in order; `''` for one with no text (the select-all column). */
	const columns = async () => {
		await table.waitFor()
		return (await table.getByRole('columnheader').allInnerTexts()).map((text) => text.trim())
	}

	/** The current page's number, from 1. */
	const page = async () => {
		await pagination.waitFor()
		return pagination.evaluate((nav) =>
			Number(
				[...nav.querySelectorAll('a')]
					.find((link) => link.getAttribute('aria-current') === 'page')
					?.textContent?.trim()
			)
		)
	}

	/** Waits until page `number` is the current page. */
	const waitForPage = async (number: number) => {
		const nav = await pagination.elementHandle()
		await root
			.page()
			.waitForFunction(
				([el, want]) =>
					[...(el as HTMLElement).querySelectorAll('a')].some(
						(link) =>
							link.getAttribute('aria-current') === 'page' &&
							link.textContent?.trim() === want
					),
				[nav, String(number)] as const
			)
	}

	/** Clicks Previous or Next unless it is disabled, then waits for the page it goes to. */
	const step = async (name: string, by: number) => {
		const button = pagination.getByRole('button', { name })
		if ((await button.getAttribute('aria-disabled')) === 'true')
			throw new Error(`"${name}" is disabled`)
		const from = await page()
		await button.click()
		await waitForPage(from + by)
	}

	/** Sets a row checkbox's state unless it is in it, then waits for it. */
	const check = async (checkbox: Locator, checked: boolean) => {
		if ((await checkbox.getAttribute('aria-checked')) !== String(checked))
			await checkbox.click()
		await checkbox.and(root.getByRole('checkbox', { checked })).waitFor()
	}

	return {
		root,
		table,
		header,
		row,
		columns,

		/** The text of each cell of each body row on the page, in order. */
		rows: async () => {
			await table.waitFor()
			return body
				.getByRole('row')
				.evaluateAll((rows) =>
					rows.map((tr) =>
						[...tr.querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '')
					)
				)
		},

		/** The cell of the row containing `text`, in the column with this label. */
		cell: async (text: string | RegExp, column: string) => {
			const index = (await columns()).indexOf(column)
			if (index < 0) throw new Error(`no column "${column}"`)
			return row(text).getByRole('cell').nth(index)
		},

		/** A column's sort order, from its header cell's `aria-sort`; `none` when it has none. */
		sort: async (column: string) => {
			const cell = header(column)
			await cell.waitFor()
			return SORT_OF[(await cell.getAttribute('aria-sort')) ?? ''] ?? 'none'
		},

		/** Opens a column's header menu, picks the order and waits for the menu to close. */
		sortBy: async (column: string, order: DataTableSortOrder) => {
			const menu = await openMenu(header(column).getByRole('button'))
			await menu.getByRole('menuitemradio', { name: SORT_LABEL[order], exact: true }).click()
			await menu.waitFor({ state: 'hidden' })
		},

		/** Types `text` into the toolbar's filter, replacing what was there; `''` clears it. */
		filter: (text: string) => root.getByRole('searchbox').fill(text),

		/**
		 * Shows or hides a column through the View menu: checks or unchecks its item, waits for the
		 * state, then closes the menu (a checkbox item keeps it open).
		 */
		toggleColumn: async (label: string, visible: boolean) => {
			const menu = await openMenu(root.getByRole('button', { name: 'View' }))
			const item = menu.getByRole('menuitemcheckbox', { name: label, exact: true })
			if ((await item.getAttribute('aria-checked')) !== String(visible)) await item.click()
			await menu
				.getByRole('menuitemcheckbox', { name: label, exact: true, checked: visible })
				.waitFor()
			await root.page().keyboard.press('Escape')
			await menu.waitFor({ state: 'hidden' })
		},

		/** Selects (or with `false`, clears) the row containing `text` through its checkbox. */
		selectRow: (text: string | RegExp, selected = true) =>
			check(row(text).getByRole('checkbox'), selected),

		/** Selects (or with `false`, clears) every row of the page through the header checkbox. */
		selectAll: (selected = true) =>
			check(table.locator('thead').getByRole('checkbox'), selected),

		/** The text of each selected row on the page, cells joined by a space. */
		selectedRows: async () => {
			await table.waitFor()
			return body
				.getByRole('row')
				.filter({ has: root.page().getByRole('checkbox', { checked: true }) })
				.evaluateAll((rows) =>
					rows.map((tr) =>
						[...tr.querySelectorAll('td')]
							.map((td) => td.textContent?.trim() ?? '')
							.filter(Boolean)
							.join(' ')
					)
				)
		},

		page,

		/** The page controls shown, in order: page numbers, `…` for a gap. */
		pages: async () => {
			await pagination.waitFor()
			return pagination.evaluate((nav) =>
				[...nav.querySelectorAll('li')]
					.slice(1, -1)
					.map((li) => (li.querySelector('a') ? (li.textContent?.trim() ?? '') : '…'))
			)
		},

		/** Goes to the next page and waits for it; throws on the last page. */
		nextPage: () => step('Go to next page', 1),

		/** Goes to the previous page and waits for it; throws on the first page. */
		previousPage: () => step('Go to previous page', -1),

		/** Goes to page `number` (from 1) and waits for it; throws when that page isn't shown. */
		goToPage: async (number: number) => {
			const link = pagination.getByRole('button', { name: String(number), exact: true })
			if ((await link.count()) === 0) throw new Error(`page ${number} is not shown`)
			await link.click()
			await waitForPage(number)
		},
	}
}
