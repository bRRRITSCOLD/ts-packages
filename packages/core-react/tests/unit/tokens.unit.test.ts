import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// node_modules
import { __unstable__loadDesignSystem } from '@tailwindcss/node'
import { describe, expect, it } from 'vitest'

// testee
import { buildStyles, type TokenFile } from '../../scripts/styles.js'
// utils
import { componentClasses, sourceFiles } from './__utils__/classes.js'

const PACKAGE_DIR = join(import.meta.dirname, '../..')
const tokens = JSON.parse(
	readFileSync(join(PACKAGE_DIR, 'tokens/tokens.json'), 'utf8')
) as TokenFile

/** Classes that mark an element for `group-*` / `peer-*` variants and emit no CSS themselves. */
const MARKER = /^(group|peer)(\/[\w-]+)?$/

const components = sourceFiles().filter(
	(file) => file.startsWith('src/components/') && !file.endsWith('.stories.tsx')
)

describe('tokens', () => {
	it('should define every semantic token in both light and dark', () => {
		expect(Object.keys(tokens.dark).sort()).toEqual(Object.keys(tokens.light).sort())
	})

	it('should resolve every class the components use to a utility of the built theme', async () => {
		const theme = await __unstable__loadDesignSystem(await buildStyles(tokens), {
			base: PACKAGE_DIR,
		})
		const classes = [...new Set(components.flatMap(componentClasses))].filter(
			(cls) => !MARKER.test(cls)
		)
		const css = theme.candidatesToCss(classes)

		expect(classes.length).toBeGreaterThan(0)
		expect(classes.filter((_, i) => css[i] === null)).toEqual([])
	})
})
