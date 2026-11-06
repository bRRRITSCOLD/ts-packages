import type { LinkNode } from './adapter.js'

/** One prop of the inspected component and where its value came from. */
export type InspectedProp = {
	prop: string
	/** As written in JSX: `"sm"`, `true`, `false`, or `omitted` for the variant value `default`. */
	value: string
	source: 'convention' | 'exceptions-record'
}

/**
 * What the link inspector shows for one selected library component or instance: the import
 * lines, the JSX, the selected component's props with their source, and every marker for what
 * the naming convention couldn't name.
 */
export type Inspection = {
	/** The selected component's export, or the page-local component's path. */
	title: string
	kind: LinkNode['kind']
	imports: string[]
	jsx: string
	props: InspectedProp[]
	/** Every hint in the tree (unresolved values, a bad exceptions record), each naming its export. */
	unresolved: string[]
}

const INDENT = '  '

const attribute = (prop: string, value: string | boolean | undefined) => {
	if (value === undefined) return undefined
	if (value === true) return prop
	if (value === false) return `${prop}={false}`
	return `${prop}=${JSON.stringify(value)}`
}

/** JSX text, or a string expression when the text holds characters JSX would read as syntax. */
const jsxText = (text: string) => (/[{}<>]/.test(text) ? `{${JSON.stringify(text)}}` : text)

const slotNote = (node: LinkNode) =>
	node.kind !== 'text' && node.slot !== undefined ? ` (slot ${node.slot})` : ''

const renderNode = (node: LinkNode, depth: number): string[] => {
	const pad = INDENT.repeat(depth)
	switch (node.kind) {
		case 'text':
			return [`${pad}${jsxText(node.text)}`]
		case 'icon':
			return [`${pad}<${node.export} />`]
		case 'empty-slot':
			return [`${pad}{/* empty slot: ${node.slot ?? node.layer} */}`]
		case 'local':
			return [
				`${pad}{/* page-local: ${node.component}${slotNote(node)} */}`,
				...node.children.flatMap((child) => renderNode(child, depth)),
			]
		case 'component': {
			const attributes = Object.entries(node.props)
				.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
				.map(([prop, { value }]) => attribute(prop, value))
				.filter((value) => value !== undefined)
			const open = [node.export, ...attributes].join(' ')
			const markers = node.unresolved.map(
				({ variantProperty, value }) =>
					`${pad}${INDENT}{/* unresolved: ${variantProperty} = ${value} */}`
			)
			const [only] = node.children
			if (markers.length === 0 && node.children.length === 0) return [`${pad}<${open} />`]
			if (markers.length === 0 && node.children.length === 1 && only.kind === 'text')
				return [`${pad}<${open}>${jsxText(only.text)}</${node.export}>`]
			return [
				`${pad}<${open}>`,
				...markers,
				...node.children.flatMap((child) => renderNode(child, depth + 1)),
				`${pad}</${node.export}>`,
			]
		}
	}
}

const walk = (node: LinkNode, visit: (node: LinkNode) => void) => {
	visit(node)
	if (node.kind === 'component' || node.kind === 'local')
		for (const child of node.children) walk(child, visit)
}

/** `import { A, B } from 'pkg'`, one line per package, packages and names sorted. */
const importLines = (node: LinkNode): string[] => {
	const byPackage = new Map<string, Set<string>>()
	walk(node, (each) => {
		if (each.kind !== 'component' && each.kind !== 'icon') return
		const names = byPackage.get(each.package) ?? new Set<string>()
		names.add(each.export)
		byPackage.set(each.package, names)
	})
	return [...byPackage.keys()]
		.sort()
		.map(
			(pkg) => `import { ${[...(byPackage.get(pkg) ?? [])].sort().join(', ')} } from '${pkg}'`
		)
}

const unresolvedMarkers = (node: LinkNode): string[] => {
	const markers: string[] = []
	walk(node, (each) => {
		if (each.kind !== 'component') return
		for (const hint of each.hints) markers.push(`${each.export}: ${hint}`)
	})
	return markers
}

/** Turns a resolved link tree into what the link inspector shows. */
export const inspect = (node: LinkNode): Inspection => ({
	title:
		node.kind === 'component' || node.kind === 'icon'
			? node.export
			: node.kind === 'local'
				? node.component
				: node.layer,
	kind: node.kind,
	imports: importLines(node),
	jsx: renderNode(node, 0).join('\n'),
	props:
		node.kind === 'component'
			? Object.entries(node.props)
					.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
					.map(([prop, { value, source }]) => ({
						prop,
						value: value === undefined ? 'omitted' : JSON.stringify(value),
						source,
					}))
			: [],
	unresolved: unresolvedMarkers(node),
})
