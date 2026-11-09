// Reads core-react's import graph for the TanStack boundary check: which modules each source
// file imports, and every file an entry reaches through relative imports.
import { existsSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

// node_modules
import ts from 'typescript'

// utils
import { PACKAGE_DIR, parse } from './package.js'

/** Every module specifier a source file imports or re-exports, type-only ones included. */
export const importsOf = (file: string): string[] =>
	parse(file).statements.flatMap((statement) =>
		(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
		statement.moduleSpecifier &&
		ts.isStringLiteral(statement.moduleSpecifier)
			? [statement.moduleSpecifier.text]
			: []
	)

/** The source file a relative `.js` specifier names: its `.ts` or `.tsx` beside it. */
const resolve = (from: string, specifier: string): string => {
	const base = normalize(join(dirname(from), specifier)).replace(/\.js$/, '')
	const found = ['.ts', '.tsx']
		.map((ext) => base + ext)
		.find((f) => existsSync(join(PACKAGE_DIR, f)))
	if (!found) throw new Error(`${from}: cannot resolve ${specifier}`)
	return found
}

/** Every file an entry reaches through relative imports, each with the specifiers it imports. */
export const importGraph = (entry: string): Map<string, string[]> => {
	const graph = new Map<string, string[]>()
	const visit = (file: string) => {
		if (graph.has(file)) return
		const specifiers = importsOf(file)
		graph.set(file, specifiers)
		for (const specifier of specifiers.filter((s) => s.startsWith('.')))
			visit(resolve(file, specifier))
	}
	visit(entry)
	return graph
}
