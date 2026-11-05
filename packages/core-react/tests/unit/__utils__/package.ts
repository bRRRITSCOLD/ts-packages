// Reads core-react's own files for the convention tests: the source scan, token checks,
// story-title and tier-placement checks.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// node_modules
import ts from 'typescript'

/** The core-react package directory. */
export const PACKAGE_DIR = join(import.meta.dirname, '../../..')

/** Every file under a directory of the package, relative to the package, in a stable order. */
export const filesUnder = (dir: string): string[] =>
	readdirSync(join(PACKAGE_DIR, dir), { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => relative(PACKAGE_DIR, join(entry.parentPath, entry.name)))
		.sort()

/** A file's source text, by its path relative to the package. */
export const source = (file: string): string => readFileSync(join(PACKAGE_DIR, file), 'utf8')

/** Parses a source as TypeScript, or as TSX when its name ends `.tsx`. */
export const parse = (file: string, code = source(file)): ts.SourceFile =>
	ts.createSourceFile(
		file,
		code,
		ts.ScriptTarget.Latest,
		true,
		file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
	)
