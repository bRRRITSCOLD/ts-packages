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

for (const name of readdirSync(join(ROOT, 'packages'))) {
	const dir = join(ROOT, 'packages', name)
	const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
	const where = `packages/${name}`

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
