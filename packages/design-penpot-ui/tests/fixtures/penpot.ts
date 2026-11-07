import { readFileSync } from 'node:fs'

import {
	EXCEPTIONS_RECORD_KEY,
	EXCEPTIONS_RECORD_NAMESPACE,
} from '@brrritscold/design-core-js/component-link'
import type { LibrarySnapshot } from '@brrritscold/design-core-js/library-snapshot'
import { vi } from 'vitest'

import type { PenpotComponent, PenpotShape } from '../../src/adapter.js'
import type { InspectorPenpot } from '../../src/plugin.js'
import type { ReaderPenpot } from '../../src/read-links.js'

/**
 * A fresh copy of the library snapshot fixture: Badge and Button variants (Button with a
 * `state` → `disabled` value map), Card with Header and Content parts, Content holding a
 * `Body` slot, `icon/Trash2` and `_internal/Slot`.
 */
export const librarySnapshot = (): LibrarySnapshot =>
	JSON.parse(readFileSync(new URL('./library.snapshot.json', import.meta.url), 'utf8'))

/** The id of the page design file the fakes put copies in; the library is another file. */
export const PAGE_FILE_ID = 'page-design-file'

/** Every write a fake exposes, so a test can assert the plugin never called one. */
export type Writes = {
	setSharedPluginData: ReturnType<typeof vi.fn>
	setPluginData: ReturnType<typeof vi.fn>
}

/** Write spies shared by every fake a test builds; none of them should ever be called. */
export const createWrites = (): Writes => ({
	setSharedPluginData: vi.fn(),
	setPluginData: vi.fn(),
})

type FakeComponent = PenpotComponent & Writes & { variantProps: Record<string, string> }

/** The fake library: a Penpot `LibraryComponent` per snapshot component, keyed by id. */
export const fakeLibrary = (
	snapshot: LibrarySnapshot,
	writes: Writes,
	overrides: { libraryId?: string; records?: Record<string, string> } = {}
): Record<string, FakeComponent> =>
	Object.fromEntries(
		Object.entries(snapshot.components).map(([id, component]) => {
			const raw =
				overrides.records?.[id] ??
				(component.exceptionsRecord === undefined
					? ''
					: JSON.stringify(component.exceptionsRecord))
			const fake: FakeComponent = {
				id,
				libraryId: overrides.libraryId ?? snapshot.libraryFileId,
				name: component.name,
				path: component.path,
				variantProps: component.variantProperties,
				isVariant: () => Object.keys(component.variantProperties).length > 0,
				getSharedPluginData: (namespace, key) =>
					namespace === EXCEPTIONS_RECORD_NAMESPACE && key === EXCEPTIONS_RECORD_KEY
						? raw
						: '',
				...writes,
			}
			return [id, fake]
		})
	)

/** A fake shape, its writes spied; `head` is the instance head it belongs to, if any. */
export type FakeShape = PenpotShape & Writes & { children: FakeShape[]; head?: FakeShape }

type Box = { x?: number; y?: number; width?: number; height?: number; hidden?: boolean }

const shape = (
	writes: Writes,
	fields: Box & {
		id: string
		name: string
		type: string
		children?: FakeShape[]
		characters?: string
		component?: PenpotComponent
	}
): FakeShape => {
	const self: FakeShape = {
		id: fields.id,
		name: fields.name,
		type: fields.type,
		x: fields.x ?? 0,
		y: fields.y ?? 0,
		width: fields.width ?? 100,
		height: fields.height ?? 20,
		hidden: fields.hidden ?? false,
		children: fields.children ?? [],
		characters: fields.characters,
		isComponentInstance: () => fields.component !== undefined || self.head !== undefined,
		isComponentHead: () => fields.component !== undefined,
		componentHead: () => (fields.component ? self : (self.head ?? null)),
		component: () => fields.component ?? null,
		// No main-component shapes in the fakes; a test that needs one assigns it.
		componentRefShape: () => null,
		...writes,
	}
	return self
}

/** Marks every plain layer under a head as belonging to it, stopping at nested heads. */
const adopt = (head: FakeShape, children: FakeShape[]) => {
	for (const child of children) {
		if (child.isComponentHead()) continue
		child.head = head
		adopt(head, child.children)
	}
}

let nextId = 0
const id = (prefix: string) => `${prefix}-${++nextId}`

/**
 * Builders for a page design over the fake library: `copy` places an instance of a library
 * component (its parts built from the snapshot unless `children` are given), `text`, `board`
 * and `group` place plain layers.
 */
export const pageBuilder = (
	snapshot: LibrarySnapshot,
	library: Record<string, PenpotComponent>,
	writes: Writes
) => {
	const copy = (
		componentId: string,
		options: Box & { layer?: string; children?: FakeShape[] } = {}
	): FakeShape => {
		const component = library[componentId]
		if (!component) throw new Error(`fixture: no component ${componentId}`)
		const children =
			options.children ??
			Object.entries(snapshot.components[componentId]?.parts ?? {}).map(
				([role, part], index) => copy(part.componentId, { layer: role, y: index * 40 })
			)
		const head = shape(writes, {
			...options,
			id: id(componentId),
			name: options.layer ?? component.name,
			type: 'board',
			children,
			component,
		})
		adopt(head, children)
		return head
	}
	const text = (characters: string, options: Box & { layer?: string } = {}) =>
		shape(writes, {
			...options,
			id: id('text'),
			name: options.layer ?? 'Label',
			type: 'text',
			characters,
		})
	const board = (name: string, children: FakeShape[], options: Box = {}) =>
		shape(writes, { ...options, id: id('board'), name, type: 'board', children })
	const group = (name: string, children: FakeShape[], options: Box = {}) =>
		shape(writes, { ...options, id: id('group'), name, type: 'group', children })
	/** A component that exists only in the page design file (a page-local part). */
	const localComponent = (path: string, name: string): PenpotComponent & Writes => ({
		id: id('local'),
		libraryId: PAGE_FILE_ID,
		name,
		path,
		isVariant: () => false,
		getSharedPluginData: () => '',
		...writes,
	})
	const localCopy = (
		component: PenpotComponent,
		children: FakeShape[],
		options: Box & { layer?: string } = {}
	) => {
		const head = shape(writes, {
			...options,
			id: id('local-copy'),
			name: options.layer ?? component.name,
			type: 'board',
			children,
			component,
		})
		adopt(head, children)
		return head
	}
	return { copy, text, board, group, localComponent, localCopy }
}

/**
 * A fake `penpot` global with the shapes a real library has: the snapshot fixture as the
 * connected library, a page design file open, `selection` settable, the UI spied.
 */
export const fakePenpot = (
	options: {
		snapshot?: LibrarySnapshot
		currentFileId?: string
		libraryId?: string
		records?: Record<string, string>
	} = {}
) => {
	const snapshot = options.snapshot ?? librarySnapshot()
	const writes = createWrites()
	const library = fakeLibrary(snapshot, writes, {
		libraryId: options.libraryId,
		records: options.records,
	})
	const listeners: Array<() => void> = []
	let onMessage: ((message: unknown) => void) | undefined
	const penpot = {
		selection: [] as FakeShape[],
		currentFile: { id: options.currentFileId ?? PAGE_FILE_ID, name: 'Page design' },
		currentPage: null as { name: string; root: FakeShape } | null,
		theme: 'dark',
		on: vi.fn((_type: 'selectionchange', callback: () => void) => {
			listeners.push(callback)
			return listeners.length
		}),
		ui: {
			open: vi.fn(),
			sendMessage: vi.fn(),
			onMessage: vi.fn(<T>(callback: (message: T) => void) => {
				onMessage = callback as (message: unknown) => void
			}),
		},
		...writes,
	} satisfies InspectorPenpot & ReaderPenpot & Writes
	return {
		penpot,
		library,
		writes,
		build: pageBuilder(snapshot, library, writes),
		/** Changes the selection the way Penpot does: set it, then fire `selectionchange`. */
		select: (...shapes: FakeShape[]) => {
			penpot.selection = shapes
			for (const listener of listeners) listener()
		},
		/** A message from the iframe UI, as `penpot.ui.onMessage` delivers it. */
		fromUi: (message: unknown) => onMessage?.(message),
	}
}
