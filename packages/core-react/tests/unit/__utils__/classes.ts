// Reads core-react's sources: the classes for the token checks and the source scan, and story
// titles and `.` exports for the story-title check.
// node_modules
import ts from 'typescript'

// utils
import { filesUnder, parse } from './package.js'

/** Every `.ts` / `.tsx` file under `src/`, stories included, relative to the package. */
export const sourceFiles = (): string[] => filesUnder('src').filter((file) => /\.tsx?$/.test(file))

const isString = (node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral =>
	ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)

const isModuleSpecifier = (node: ts.Node) =>
	(ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent)) &&
	node.parent.moduleSpecifier === node

/** Every string literal in a source file except import and export paths. */
export const stringsIn = (file: string): string[] => {
	const found: string[] = []
	const visit = (node: ts.Node) => {
		if (isString(node) && !isModuleSpecifier(node)) found.push(node.text)
		else if (ts.isTemplateExpression(node))
			found.push(node.head.text, ...node.templateSpans.map((span) => span.literal.text))
		ts.forEachChild(node, visit)
	}
	visit(parse(file))
	return found
}

/** Splits a class on the variant separators outside brackets: the last part is the utility. */
const utilityOf = (cls: string) => {
	let depth = 0
	let start = 0
	for (let i = 0; i < cls.length; i++) {
		const char = cls[i]
		if (char === '[' || char === '(') depth++
		else if (char === ']' || char === ')') depth--
		else if (char === ':' && depth === 0) start = i + 1
	}
	return cls.slice(start).replace(/^[!-]+|!$/g, '')
}

/**
 * The CSS variables Base UI sets on a popup at runtime to size and place it against its anchor.
 * They are layout, not design: a token can't stand in for the anchor's width.
 */
export const BASE_UI_VARS = [
	'--anchor-height',
	'--anchor-width',
	'--available-height',
	'--available-width',
	'--transform-origin',
]

/** `origin-(--transform-origin)`: a utility reading one of Base UI's runtime variables. */
const readsBaseUiVar = (utility: string) => {
	const read = /^[\w-]+-\((--[\w-]+)\)$/.exec(utility)?.[1]
	return read !== undefined && BASE_UI_VARS.includes(read)
}

/**
 * `min-w-[calc(var(--anchor-width)+var(--spacing-7))]`: arithmetic on Base UI's runtime
 * variables and spacing tokens only, the anchor's width plus a step of the scale. Every value it
 * reads is a variable, so nothing raw can hide in it.
 */
const computesFromBaseUiVar = (utility: string) => {
	const value = /^[\w-]+-\[(.+)\]$/.exec(utility)?.[1]
	if (value === undefined) return false
	const read = [...value.matchAll(/var\((--[\w-]+)\)/g)].map(([, name = '']) => name)
	return (
		read.some((name) => BASE_UI_VARS.includes(name)) &&
		read.every((name) => BASE_UI_VARS.includes(name) || /^--spacing-[\w-]+$/.test(name)) &&
		/^(?:calc|min|max|[()+\-*,_\s])*$/.test(value.replace(/var\(--[\w-]+\)/g, ''))
	)
}

/** `bg-[#fff]`, `p-[13px]`, `bg-(--brand)`, `[mask-type:luminance]`, `bg-primary/[0.4]`. */
const isArbitraryValue = (utility: string) =>
	/[[(]/.test(utility) && !readsBaseUiVar(utility) && !computesFromBaseUiVar(utility)

const PALETTE =
	'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
/** `bg-slate-500`, `ring-offset-zinc-950/50`, `text-white`, `bg-black/50`. */
const DEFAULT_PALETTE = new RegExp(
	`^(?:[a-z]+-)+(?:(?:${PALETTE})-(?:50|[1-9]00|950)|black|white)(?:/\\d+)?$`
)

/** The classes in these strings that step off the token system: arbitrary values and Tailwind's default palette. */
export const forbiddenClasses = (strings: string[]): string[] =>
	strings
		.flatMap((s) => s.split(/\s+/))
		.filter(Boolean)
		.filter((cls) => {
			const utility = utilityOf(cls)
			return isArbitraryValue(utility) || DEFAULT_PALETTE.test(utility)
		})

/** Calls whose string arguments are class lists. */
const CLASS_CALLS = new Set(['cva', 'cn'])

/** The strings under a node that are class lists: values, not keys, and not cva's `defaultVariants`. */
const classStrings = (node: ts.Node): string[] => {
	if (isString(node)) return [node.text]
	if (ts.isPropertyAssignment(node))
		return node.name.getText() === 'defaultVariants' ? [] : classStrings(node.initializer)
	const found: string[] = []
	ts.forEachChild(node, (child) => {
		found.push(...classStrings(child))
	})
	return found
}

/** The classes a component file applies: arguments to `cva()` and `cn()`, and `className` strings. */
export const componentClasses = (file: string): string[] => {
	const found: string[] = []
	const visit = (node: ts.Node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			CLASS_CALLS.has(node.expression.text)
		)
			found.push(...node.arguments.flatMap(classStrings))
		else if (
			ts.isJsxAttribute(node) &&
			node.name.getText() === 'className' &&
			node.initializer &&
			isString(node.initializer)
		)
			found.push(node.initializer.text)
		ts.forEachChild(node, visit)
	}
	visit(parse(file))
	return found.flatMap((s) => s.split(/\s+/)).filter(Boolean)
}

/** The `title` of a stories file's default export, `Components/Button`. */
export const storyTitle = (file: string): string | undefined => {
	let title: string | undefined
	const visit = (node: ts.Node) => {
		if (
			ts.isPropertyAssignment(node) &&
			node.name.getText() === 'title' &&
			isString(node.initializer)
		)
			title ??= node.initializer.text
		ts.forEachChild(node, visit)
	}
	visit(parse(file))
	return title
}

/** The names `src/index.ts`, the `.` entry, exports. */
export const rootExports = (): string[] =>
	parse('src/index.ts').statements.flatMap((statement) =>
		ts.isExportDeclaration(statement) &&
		statement.exportClause &&
		ts.isNamedExports(statement.exportClause)
			? statement.exportClause.elements.map((element) => element.name.text)
			: []
	)
