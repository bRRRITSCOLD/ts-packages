// node_modules
import { describe, expect, it } from 'vitest'

// utils
import { sourceFiles } from './__utils__/classes.js'
import { importGraph, importsOf } from './__utils__/imports.js'

const TANSTACK = /^@tanstack\//

describe('TanStack boundary', () => {
	it('should reach no TanStack module from the `.` entry, so the primitives stay engine-agnostic', () => {
		const offenders = [...importGraph('src/index.ts')].flatMap(([file, specifiers]) =>
			specifiers.filter((s) => TANSTACK.test(s)).map((s) => `${file}: ${s}`)
		)

		expect(importGraph('src/index.ts').size).toBeGreaterThan(1)
		expect(offenders).toEqual([])
	})

	it('should import `@tanstack/react-table` from `src/data-table.ts` only', () => {
		const importers = sourceFiles()
			.filter((file) => !file.endsWith('.stories.tsx'))
			.filter((file) => importsOf(file).some((s) => TANSTACK.test(s)))

		expect(importers).toEqual(['src/data-table.ts'])
	})

	describe('importGraph', () => {
		it('should follow relative imports into the files they name', () => {
			const graph = importGraph('src/index.ts')

			expect(graph.has('src/components/button.tsx')).toBe(true)
			expect(graph.get('src/components/button.tsx')).toContain('@base-ui/react/button')
		})
	})
})
