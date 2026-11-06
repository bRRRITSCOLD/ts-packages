#!/usr/bin/env node
/**
 * Enforces the entry-point standard for every package in packages/*:
 *
 * - no package-root entry: `exports` has no "." key and package.json has no
 *   `main` / `module` / `types`, so consumers always import a fully qualified
 *   subpath (`@brrritscold/core-js/date`, never `@brrritscold/core-js`)
 * - no `index.ts` barrel anywhere in src/ (`export * as x` namespaces included)
 * - every subpath in `exports` is built by tsup and documented by TypeDoc, and
 *   nothing is built or documented that is not exported
 *
 * `core-react` is the one allowlisted exception (ROOT_ENTRY_ALLOWED): an ESM-only,
 * unbundled `tsc` build with a pure `src/index.ts` barrel as its `.` entry. For it the
 * check is that the barrel holds only named re-exports, and that every JavaScript
 * subpath has its source file. Its `.css` and `.json` exports are build output.
 *
 * Bundle-only packages (BUNDLE_ONLY) build browser scripts, not a library: the check is that
 * they are private and export nothing.
 *
 * Run with `pnpm check:entries`; CI runs it in the `check` job.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const problems = []

const walk = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
		d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]
	)

/** `./query/mongodb` → `src/query/mongodb.ts` */
const sourceOf = (subpath) => `src/${subpath.replace(/^\.\//, '')}.ts`

/** Pulls the quoted `src/….ts` paths out of a tsup config's `entryPoints` array. */
const tsupEntries = (config) => {
	const block = config.match(/entryPoints:\s*\[([^\]]*)\]/)
	return block ? [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
}

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x))

/**
 * Packages that build browser bundles and export nothing (`design-penpot-ui`: the link
 * inspector plugin and `read-links.js`). The check is that they stay private with no exports.
 */
const BUNDLE_ONLY = new Set(['design-penpot-ui'])

/** Packages allowed a root `.` entry: a pure barrel, built unbundled by `tsc`. */
const ROOT_ENTRY_ALLOWED = new Set(['core-react'])

/** `./dist/icons.js` → `src/icons.ts` or `src/icons.tsx`, whichever exists. */
const tscSourceOf = (dir, built) => {
	const stem = built.replace(/^\.\/dist\//, 'src/').replace(/\.js$/, '')
	return [`${stem}.ts`, `${stem}.tsx`].find((src) => existsSync(join(dir, src))) ?? `${stem}.ts`
}

/** A pure barrel: nothing but `export { … } from '…'` (and `export type`), no logic, no `export *`. */
const NAMED_RE_EXPORT = /^export (type )?\{[^}]*\} from '[^']+'$/

const checkRootEntryPackage = (dir, pkg, where) => {
	for (const field of ['main', 'module', 'types'])
		if (field in pkg) problems.push(`${where}: package.json has "${field}"; use "exports"`)

	for (const file of walk(join(dir, 'src')))
		if (/[/\\]index\.tsx?$/.test(file) && relative(dir, file) !== join('src', 'index.ts'))
			problems.push(
				`${where}: ${relative(dir, file)} is a barrel; only src/index.ts may be one`
			)

	const barrel = join(dir, 'src', 'index.ts')
	if (existsSync(barrel)) {
		const statements = readFileSync(barrel, 'utf8')
			.replace(/\/\/.*$/gm, '')
			.split(/;|\n(?=export)/)
			.map((s) => s.replace(/\s+/g, ' ').trim())
			.filter(Boolean)
		for (const statement of statements)
			if (!NAMED_RE_EXPORT.test(statement))
				problems.push(
					`${where}: src/index.ts must only re-export by name, found: ${statement}`
				)
	}

	for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
		if (typeof target === 'string') continue // ./styles.css, ./tokens.json: build output
		const src = tscSourceOf(dir, target.default)
		if (!existsSync(join(dir, src)))
			problems.push(`${where}: ${subpath} maps to missing ${src}`)
	}
}

for (const name of readdirSync(join(ROOT, 'packages'))) {
	const dir = join(ROOT, 'packages', name)
	const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
	const where = `packages/${name}`

	if (ROOT_ENTRY_ALLOWED.has(name)) {
		checkRootEntryPackage(dir, pkg, where)
		continue
	}

	if (BUNDLE_ONLY.has(name)) {
		if (pkg.private !== true) problems.push(`${where}: a bundle-only package must be private`)
		for (const field of ['exports', 'main', 'module', 'types'])
			if (field in pkg) problems.push(`${where}: a bundle-only package has no "${field}"`)
		continue
	}

	if ('.' in (pkg.exports ?? {})) problems.push(`${where}: exports has a "." root entry`)
	for (const field of ['main', 'module', 'types'])
		if (field in pkg) problems.push(`${where}: package.json has "${field}" (a root entry)`)

	for (const file of walk(join(dir, 'src')))
		if (/[/\\]index\.tsx?$/.test(file))
			problems.push(
				`${where}: ${relative(dir, file)} is a barrel; export each module as its own subpath`
			)

	const expected = Object.keys(pkg.exports ?? {})
		.map(sourceOf)
		.sort()
	for (const src of expected)
		if (!existsSync(join(dir, src))) problems.push(`${where}: exports maps to missing ${src}`)

	const built = tsupEntries(readFileSync(join(dir, 'tsup.config.ts'), 'utf8')).sort()
	if (!sameSet(built, expected))
		problems.push(`${where}: tsup entryPoints [${built}] differ from exports [${expected}]`)

	const documented = JSON.parse(
		readFileSync(join(dir, 'typedoc.json'), 'utf8')
	).entryPoints.sort()
	if (!sameSet(documented, expected))
		problems.push(
			`${where}: typedoc entryPoints [${documented}] differ from exports [${expected}]`
		)
}

if (problems.length) {
	console.error(`Entry-point standard violations:\n  ${problems.join('\n  ')}`)
	process.exit(1)
}
console.log('entry points ok')
