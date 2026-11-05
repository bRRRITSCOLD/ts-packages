// node_modules
import { describe, expect, it } from 'vitest'

// utils
import { misplaced, skipCalls, source, tierFiles } from './__utils__/tiers.js'

describe('tier placement', () => {
	it('should find every test file under tests/ in the directory its suffix names', () => {
		expect(tierFiles().filter(misplaced)).toEqual([])
	})

	it('should find no skipped test or suite in any tier', () => {
		const offenders = tierFiles().flatMap((file) =>
			skipCalls(source(file)).map((call) => `${file}: ${call}`)
		)

		expect(offenders).toEqual([])
	})

	describe('misplaced', () => {
		it('should accept a file whose suffix matches its tier directory', () => {
			expect(misplaced('tests/unit/cn.unit.test.ts')).toBe(false)
			expect(misplaced('tests/unit/hooks/useThing.unit.test.tsx')).toBe(false)
			expect(misplaced('tests/integration/dialog.integration.spec.ts')).toBe(false)
		})

		it('should reject a file whose suffix names another tier or runner', () => {
			expect(misplaced('tests/unit/dialog.integration.spec.ts')).toBe(true)
			expect(misplaced('tests/integration/dialog.integration.test.ts')).toBe(true)
			expect(misplaced('tests/integration/dialog.spec.ts')).toBe(true)
			expect(misplaced('tests/unit/cn.test.ts')).toBe(true)
		})

		it('should leave the harness and fixtures alone', () => {
			expect(misplaced('tests/integration/__utils__/story.ts')).toBe(false)
			expect(misplaced('tests/unit/__fixtures__/rows.ts')).toBe(false)
		})
	})

	describe('skipCalls', () => {
		it('should find a skipped test or suite, under any runner', () => {
			expect(
				skipCalls(`
					it.skip('a', () => {})
					test.describe.skip('b', () => {})
					test.skip(({ browserName }) => browserName === 'webkit')
					it('c', (ctx) => ctx.skip())
				`)
			).toEqual(['it.skip', 'test.describe.skip', 'test.skip', 'ctx.skip'])
		})

		it('should allow test.fixme and a skip that is only text', () => {
			expect(skipCalls("test.fixme('a', () => {}); it('should not skip', () => {})")).toEqual(
				[]
			)
		})
	})
})
