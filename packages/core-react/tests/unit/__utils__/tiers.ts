// Reads core-react's test tree for the tier-placement convention test.
// node_modules
import ts from 'typescript'

// utils
import { filesUnder, parse } from './package.js'

/** Each tier directory under tests/ and the suffix its files carry. */
const TIERS: Record<string, RegExp> = {
	unit: /\.unit\.test\.tsx?$/,
	integration: /\.integration\.spec\.ts$/,
}

/** Every file under a tier directory, harness included, relative to the package. */
export const tierFiles = (): string[] =>
	Object.keys(TIERS).flatMap((tier) => filesUnder(`tests/${tier}`))

/** Every file that holds tests: each tier's files, and the stories (the `stories` tier, in `src/`). */
export const testFiles = (): string[] => [
	...tierFiles(),
	...filesUnder('src').filter((file) => file.endsWith('.stories.tsx')),
]

/** True when a test file's suffix doesn't match its tier directory; `__utils__/` and the like are exempt. */
export const misplaced = (file: string): boolean => {
	const [, tier = '', ...rest] = file.split('/')
	if (rest.some((segment) => /^__\w+__$/.test(segment))) return false
	return !TIERS[tier]?.test(file)
}

/** The callees of every `….skip(…)` call in a source: `it.skip`, `test.describe.skip`, `ctx.skip`. */
export const skipCalls = (code: string, file = 'source.ts'): string[] => {
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
	visit(parse(file, code))
	return found
}
