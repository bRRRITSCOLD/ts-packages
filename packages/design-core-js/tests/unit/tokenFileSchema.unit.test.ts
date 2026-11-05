import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

// testee
import { flattenTokens, tokenFileSchema } from '../../src/token-file.js'
// fixtures
import { createTokenFile } from './__fixtures__/checkDrift.unit.fixtures.js'

/** core-react's real token file, which this schema must keep reading. */
const CORE_REACT_TOKEN_FILE = new URL('../../../core-react/tokens/tokens.json', import.meta.url)

describe('tokenFileSchema', () => {
	it("should accept core-react's token file", () => {
		const tokens = JSON.parse(readFileSync(CORE_REACT_TOKEN_FILE, 'utf8'))

		expect(tokenFileSchema.safeParse(tokens).success).toBe(true)
	})

	it('should reject `$themes`, which the token file never carries', () => {
		const tokens = { ...createTokenFile(), $themes: [] }

		expect(tokenFileSchema.safeParse(tokens).success).toBe(false)
	})

	it('should reject a token with a key DTCG does not define here', () => {
		const tokens = createTokenFile()
		tokens.light.primary = { $type: 'color', $value: '#000000', $extensions: {} } as never

		expect(tokenFileSchema.safeParse(tokens).success).toBe(false)
	})
})

describe('flattenTokens', () => {
	it('should key each token by its full dotted name', () => {
		expect(Object.keys(flattenTokens(createTokenFile().primitive))).toEqual([
			'color.white',
			'color.neutral.100',
			'color.neutral.900',
			'border-radius.lg',
			'shadow.xs',
		])
	})
})
