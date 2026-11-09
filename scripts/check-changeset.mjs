#!/usr/bin/env node
/**
 * Fails when a change to a published `core-react` file has no changeset naming the package.
 *
 * Published files: `src/` (stories aside: they are excluded from the build),
 * `tokens/tokens.json`, and `scripts/` (the `styles.css` build). Library-only changes
 * (`design/`) and tests get no changeset.
 *
 * Usage: `node scripts/check-changeset.mjs <base-ref>` (CI passes the PR's base SHA).
 * Rules: docs/design-system/SPEC.md → D3.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const base = process.argv[2]
if (!base) {
	console.error('usage: check-changeset.mjs <base-ref>')
	process.exit(2)
}

const PACKAGE = '@brrritscold/core-react'
const PUBLISHED =
	/^packages\/core-react\/(src\/(?!.*\.stories\.tsx$)|tokens\/tokens\.json$|scripts\/)/

const diff = (...args) =>
	execFileSync('git', ['diff', '--name-only', ...args, `${base}...HEAD`], { encoding: 'utf8' })
		.split('\n')
		.filter(Boolean)

const touched = diff().filter((f) => PUBLISHED.test(f))
if (touched.length === 0) {
	console.log('No published core-react file changed; no changeset needed.')
	process.exit(0)
}

/** Frontmatter line such as `'@brrritscold/core-react': minor`. */
const names = (file) =>
	new RegExp(`^['"]?${PACKAGE}['"]?\\s*:\\s*(patch|minor|major)\\s*$`, 'm').test(
		readFileSync(file, 'utf8')
	)

const changesets = diff('--diff-filter=AM')
	.filter((f) => /^\.changeset\/[^/]+\.md$/.test(f) && f !== '.changeset/README.md')
	.filter(names)

if (changesets.length > 0) {
	console.log(`core-react changeset: ${changesets.join(', ')}`)
	process.exit(0)
}

console.error(`These published core-react files changed without a changeset naming ${PACKAGE}:`)
for (const f of touched) console.error(`  ${f}`)
console.error(
	'Run `pnpm changeset`, pick @brrritscold/core-react and a bump (see packages/core-react/README.md).'
)
process.exit(1)
