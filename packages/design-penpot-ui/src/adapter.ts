import {
	EXCEPTIONS_RECORD_KEY,
	EXCEPTIONS_RECORD_NAMESPACE,
	type ExceptionsRecord,
	exceptionsRecordSchema,
	findNearMiss,
	type LinkedProp,
	resolveComponentLink,
	type UnresolvedVariantValue,
} from '@brrritscold/design-core-js/component-link'

/**
 * The read-only slice of a Penpot library component the adapter uses. A real
 * `LibraryComponent` from `@penpot/plugin-types` satisfies it; it holds no write method, so
 * nothing built on the adapter can write plugin data.
 */
export type PenpotComponent = {
	readonly id: string
	readonly libraryId: string
	readonly name: string
	readonly path: string
	isVariant(): boolean
	getSharedPluginData(namespace: string, key: string): string
}

/** The read-only slice of a Penpot shape the adapter uses; a real `Shape` satisfies it. */
export type PenpotShape = {
	readonly id: string
	readonly name: string
	readonly type: string
	readonly x: number
	readonly y: number
	readonly width: number
	readonly height: number
	readonly hidden: boolean
	readonly children?: readonly PenpotShape[]
	readonly characters?: string
	isComponentInstance(): boolean
	isComponentHead(): boolean
	componentHead(): PenpotShape | null
	component(): PenpotComponent | null
	/** In a copy, the shape of the main component this shape mirrors; `null` once swapped. */
	componentRefShape(): PenpotShape | null
}

/** Where the walk is: the open file decides which components are page-local. */
export type AdapterContext = { currentFileId: string }

/** What every node but text carries: its layer, and its role inside the component it sits in. */
type NodeBase = {
	/** The layer name on the canvas; a swap renames it, so it never identifies a part. */
	layer: string
	/** The Penpot layer id. */
	id: string
	/**
	 * The part's role: its name inside the component it sits in, read from the main component
	 * so it survives a swap renaming the layer (`Body` → `Notifications / Footer`). Absent on a
	 * node that isn't inside a component.
	 */
	role?: string
	/** The role, when the parent's exceptions record lists this part as a slot. */
	slot?: string
}

/** How a component's exceptions record read: absent, valid, or present but invalid. */
export type ExceptionsRecordStatus = 'none' | 'valid' | 'invalid'

/**
 * One node of a resolved link tree: what a library component, an instance or a page design
 * links to, in visual order.
 *
 * - `component`: a library component copy (or main instance) resolved to an export and props;
 *   its children are its parts and text, layout wrappers flattened away.
 * - `icon`: an `icon/` component, a `<Name>Icon` export.
 * - `empty-slot`: an `_internal/Slot` placeholder still showing, so that part is empty.
 * - `local`: a page-local component (not in the library); it has no link, its children may.
 * - `text`: a text layer, the children of the component it sits in.
 */
export type LinkNode =
	| (NodeBase & {
			kind: 'component'
			package: string
			export: string
			props: Record<string, LinkedProp>
			/** Variant values the exceptions record maps the property of but not the value. */
			unresolved: UnresolvedVariantValue[]
			exceptionsRecord: ExceptionsRecordStatus
			/** Why something didn't resolve, with a `did you mean` when one name is close. */
			hints: string[]
			children: LinkNode[]
	  })
	| (NodeBase & { kind: 'icon'; package: string; export: string })
	| (NodeBase & { kind: 'empty-slot' })
	| (NodeBase & { kind: 'local'; component: string; children: LinkNode[] })
	| { kind: 'text'; layer: string; id: string; text: string }

/** Path groups only the design system library uses, so a component under one is a library component. */
const LIBRARY_GROUPS = new Set(['Components', 'icon', '_internal'])

const groupsOf = (path: string) =>
	path
		.split('/')
		.map((segment) => segment.trim())
		.filter(Boolean)

/**
 * A library component comes from another file (a connected library), or sits under one of the
 * library's own groups, which is how the library file itself reads.
 */
const isLibraryComponent = (component: PenpotComponent, context: AdapterContext) =>
	component.libraryId !== context.currentFileId ||
	LIBRARY_GROUPS.has(groupsOf(component.path)[0] ?? '')

type RecordRead =
	| { status: 'none' }
	| { status: 'valid'; record: ExceptionsRecord }
	| { status: 'invalid'; problem: string }

/** Reads and validates the exceptions record; an invalid one is reported, never thrown. */
const readExceptionsRecord = (component: PenpotComponent): RecordRead => {
	const raw = component.getSharedPluginData(EXCEPTIONS_RECORD_NAMESPACE, EXCEPTIONS_RECORD_KEY)
	if (!raw) return { status: 'none' }
	let json: unknown
	try {
		json = JSON.parse(raw)
	} catch {
		return { status: 'invalid', problem: 'it is not JSON' }
	}
	const parsed = exceptionsRecordSchema.safeParse(json)
	if (parsed.success) return { status: 'valid', record: parsed.data }
	const problem = parsed.error.issues
		.map((issue) => `${issue.path.join('.') || '(record)'}: ${issue.message}`)
		.join('; ')
	return { status: 'invalid', problem }
}

const didYouMean = (name: string, candidates: Iterable<string>) => {
	const match = findNearMiss(name, candidates)
	return match === undefined ? '' : `; did you mean \`${match}\`?`
}

/** The hints for what the exceptions record names but the component doesn't have. */
const recordHints = (
	record: ExceptionsRecord,
	variantProperties: Record<string, string>,
	roles: string[]
): string[] => {
	const hints: string[] = []
	const properties = Object.keys(variantProperties)
	for (const [prop, { from, map }] of Object.entries(record.props ?? {})) {
		if (!(from in variantProperties)) {
			hints.push(
				`The exceptions record sets \`${prop}\` from variant property \`${from}\`, which this component doesn't have${didYouMean(from, properties)}`
			)
			continue
		}
		const value = variantProperties[from]
		if (!(value in map))
			hints.push(
				`\`${from}\` = \`${value}\` isn't in the value map for \`${prop}\` (${Object.keys(
					map
				)
					.map((key) => `\`${key}\``)
					.join(', ')})${didYouMean(value, Object.keys(map))}`
			)
	}
	for (const role of record.slots ?? [])
		if (!roles.includes(role))
			hints.push(
				`The exceptions record lists slot \`${role}\`, which isn't a part here${didYouMean(role, roles)}`
			)
	return hints
}

/**
 * Sorts siblings into reading order: top to bottom, and left to right within a row (two
 * shapes whose vertical extents overlap share a row).
 */
const inVisualOrder = (shapes: readonly PenpotShape[]): PenpotShape[] =>
	[...shapes].sort((a, b) => {
		const sameRow = a.y < b.y + b.height && b.y < a.y + a.height
		return sameRow ? a.x - b.x || a.y - b.y : a.y - b.y
	})

const isComponentHead = (shape: PenpotShape) =>
	shape.isComponentInstance() && shape.isComponentHead()

/**
 * A child's role inside its component: the name of the main-component shape it mirrors. A
 * swapped copy no longer mirrors one, but keeps its position, so the role is the name at its
 * index in the parent's reference. A main instance's children are the main shapes themselves.
 */
const roleOf = (child: PenpotShape, parent: PenpotShape): string | undefined => {
	const ref = child.componentRefShape()
	if (ref) return ref.name
	const parentRef = parent.componentRefShape()
	if (parentRef) {
		const index = (parent.children ?? []).findIndex((sibling) => sibling.id === child.id)
		const mirrored = parentRef.children?.[index]
		if (mirrored) return mirrored.name
	}
	return parent.isComponentInstance() ? child.name : undefined
}

/** The children of a shape as link nodes, in visual order, hidden layers left out. */
const readChildren = (shape: PenpotShape, context: AdapterContext): LinkNode[] =>
	inVisualOrder(shape.children ?? []).flatMap((child) =>
		readShape(child, context, roleOf(child, shape))
	)

const readComponent = (
	shape: PenpotShape,
	component: PenpotComponent,
	context: AdapterContext,
	role: string | undefined
): LinkNode => {
	const base = { layer: shape.name, id: shape.id, ...(role === undefined ? {} : { role }) }
	if (!isLibraryComponent(component, context))
		return {
			...base,
			kind: 'local',
			component: [...groupsOf(component.path), component.name].join('/'),
			children: readChildren(shape, context),
		}

	const variantProperties = component.isVariant()
		? { ...(component as unknown as { variantProps: Record<string, string> }).variantProps }
		: {}
	const record = readExceptionsRecord(component)
	const link = resolveComponentLink(
		{ path: component.path, name: component.name, variantProperties },
		record.status === 'valid' ? record.record : undefined
	)
	if (link.kind === 'internal') return { ...base, kind: 'empty-slot' }
	if (link.kind === 'icon')
		return { ...base, kind: 'icon', package: link.package, export: link.export }

	const children = readChildren(shape, context)
	const roles = children.flatMap((child) =>
		child.kind === 'text' || child.role === undefined ? [] : [child.role]
	)
	const slots = new Set(record.status === 'valid' ? (record.record.slots ?? []) : [])
	for (const child of children)
		if (child.kind !== 'text' && child.role !== undefined && slots.has(child.role))
			child.slot = child.role

	const hints =
		record.status === 'invalid'
			? [`The exceptions record is invalid and was ignored: ${record.problem}`]
			: record.status === 'valid'
				? recordHints(record.record, variantProperties, roles)
				: []

	return {
		...base,
		kind: 'component',
		package: link.package,
		export: link.export,
		props: link.props,
		unresolved: link.unresolved,
		exceptionsRecord: record.status,
		hints,
		children,
	}
}

/**
 * Reads one shape as link nodes: an instance head (main or copy) is one node; a text layer is
 * text; a plain board or group is a layout wrapper, so it yields its children's nodes; a hidden
 * layer yields nothing.
 */
export const readShape = (
	shape: PenpotShape,
	context: AdapterContext,
	role?: string
): LinkNode[] => {
	if (shape.hidden) return []
	const component = isComponentHead(shape) ? shape.component() : null
	if (component) return [readComponent(shape, component, context, role)]
	if (shape.type === 'text')
		return [{ kind: 'text', layer: shape.name, id: shape.id, text: shape.characters ?? '' }]
	return readChildren(shape, context)
}

/**
 * The link of a selected layer: the instance it belongs to (the layer itself, or the head of
 * the instance it is inside), or `undefined` when it isn't part of an instance.
 */
export const readSelection = (
	shape: PenpotShape,
	context: AdapterContext
): LinkNode | undefined => {
	if (!shape.isComponentInstance()) return undefined
	const head = isComponentHead(shape) ? shape : shape.componentHead()
	if (!head) return undefined
	const [node] = readShape(head, context)
	return node
}

/** One top-level layer of a page and the links under it. */
export type PageLinks = { layer: string; id: string; links: LinkNode[] }

/**
 * Every link on a page, in visual order: one entry per visible top-level layer (a page design
 * board, or an instance placed straight on the canvas).
 */
export const readPage = (root: PenpotShape, context: AdapterContext): PageLinks[] =>
	inVisualOrder(root.children ?? [])
		.filter((shape) => !shape.hidden)
		.map((shape) => ({
			layer: shape.name,
			id: shape.id,
			links: isComponentHead(shape)
				? readShape(shape, context)
				: readChildren(shape, context),
		}))
