import { describe, expect, it } from 'vitest'
// testee
import type { TokenFile } from '../../src/token-file.js'
import { findUnmigratedTokens, type TokenMigration } from '../../src/token-sync.js'

const color = (value: string) => ({ $type: 'color', $value: value }) as const

const BASE: TokenFile = {
	primitive: { color: { neutral: { 50: color('#fafafa'), 950: color('#0a0a0a') } } },
	light: { primary: color('{color.neutral.950}'), brand: color('{color.neutral.950}') },
	dark: { primary: color('{color.neutral.50}'), brand: color('{color.neutral.50}') },
}

/** The base token file with `brand` gone from both themes. */
const WITHOUT_BRAND: TokenFile = {
	primitive: BASE.primitive,
	light: { primary: BASE.light.primary },
	dark: { primary: BASE.dark.primary },
}

const migration = (from: string, to: string | null): TokenMigration => ({
	version: '1.1.0',
	from,
	to,
})

describe('findUnmigratedTokens', () => {
	it('should find nothing when no token is removed', () => {
		expect(findUnmigratedTokens({ base: BASE, head: BASE, migrations: [] })).toEqual([])
	})

	it('should name a token removed with no migration', () => {
		expect(findUnmigratedTokens({ base: BASE, head: WITHOUT_BRAND, migrations: [] })).toEqual([
			'brand',
		])
	})

	it('should pass a token renamed or removed with a migration entry', () => {
		expect(
			findUnmigratedTokens({
				base: BASE,
				head: WITHOUT_BRAND,
				migrations: [migration('brand', 'primary')],
			})
		).toEqual([])
		expect(
			findUnmigratedTokens({
				base: BASE,
				head: WITHOUT_BRAND,
				migrations: [migration('brand', null)],
			})
		).toEqual([])
	})

	it('should name a removed primitive by its full path', () => {
		const head: TokenFile = {
			...BASE,
			primitive: { color: { neutral: { 950: color('#0a0a0a') } } },
			dark: { primary: color('{color.neutral.950}'), brand: color('{color.neutral.950}') },
		}

		expect(findUnmigratedTokens({ base: BASE, head, migrations: [] })).toEqual([
			'color.neutral.50',
		])
	})

	it('should not count a token that stays in another set as removed', () => {
		const head: TokenFile = { ...BASE, dark: { primary: BASE.dark.primary } }

		expect(findUnmigratedTokens({ base: BASE, head, migrations: [] })).toEqual([])
	})

	it('should not count a token added in head', () => {
		const head: TokenFile = {
			...BASE,
			light: { ...BASE.light, accent: color('{color.neutral.50}') },
		}

		expect(findUnmigratedTokens({ base: BASE, head, migrations: [] })).toEqual([])
	})
})
