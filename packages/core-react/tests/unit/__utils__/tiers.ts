// Reads core-react's test tree for the tier-placement convention test.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// node_modules
import ts from 'typescript'

const PACKAGE_DIR = join(import.meta.dirname, '../../..')

/** Each tier directory under tests/ and the suffix its files carry. */
const TIERS: Record<string, RegExp> = {
	unit: /\.unit\.test\.tsx?$/,
	integration: /\.integration\.spec\.ts$/,
}

const walk = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
	)

/** Every file under a tier directory, harness included, relative to the package. */
export const tierFiles = (): string[] =>
	Object.keys(TIERS)
		.flatMap((tier) => walk(join(PACKAGE_DIR, 'tests', tier)))
		.map((file) => relative(PACKAGE_DIR, file))

/** True when a test file's suffix doesn't match its tier directory; `__utils__/` and the like are exempt. */
export const misplaced = (file: string): boolean => {
	const [, tier = '', ...rest] = file.split('/')
	if (rest.some((segment) => /^__\w+__$/.test(segment))) return false
	return !TIERS[tier]?.test(file)
}

/** A file's source text, by its path relative to the package. */
export const source = (file: string): string => readFileSync(join(PACKAGE_DIR, file), 'utf8')

/** The callees of every `….skip(…)` call in a source: `it.skip`, `test.describe.skip`, `ctx.skip`. */
export const skipCalls = (code: string): string[] => {
	const found: string[] = []
	const visit = (node: ts.Node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.name.text === 'skip'
		)
			found.push(node.expression.getText())
		ts.forEachChild(node, visit)
	}
	visit(ts.createSourceFile('source.ts', code, ts.ScriptTarget.Latest, true))
	return found
}
