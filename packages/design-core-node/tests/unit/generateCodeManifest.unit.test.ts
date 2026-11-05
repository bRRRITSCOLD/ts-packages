import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// testee
import { generateCodeManifest } from '../../src/code-manifest.js'

const fixture = (file: string) =>
	fileURLToPath(new URL(`./__fixtures__/core-react/${file}`, import.meta.url))

describe('generateCodeManifest', () => {
	const manifest = generateCodeManifest({
		entry: fixture('index.d.ts'),
		icons: fixture('icons.d.ts'),
	})

	it('should list every value export of the entry, and no type-only export', () => {
		expect(Object.keys(manifest.exports)).toEqual([
			'Badge',
			'Button',
			'Card',
			'CardContent',
			'CardHeader',
			'Toggle',
			'buttonVariants',
			'cn',
		])
	})

	it("should list a component's boolean and literal-union props, and no other prop", () => {
		expect(manifest.exports.Button).toEqual({
			props: {
				asChild: { type: 'boolean', optional: true },
				disabled: { type: 'boolean', optional: true },
				size: { type: 'literals', values: ['default', 'sm'], optional: true },
				variant: { type: 'literals', values: ['default', 'outline'], optional: true },
			},
		})
	})

	it('should read props through a component type with a call signature', () => {
		expect(manifest.exports.Badge).toEqual({
			props: {
				variant: { type: 'literals', values: ['default', 'secondary'], optional: true },
			},
		})
	})

	it('should mark a required prop, and keep booleans as literals in a mixed union', () => {
		expect(manifest.exports.Toggle).toEqual({
			props: {
				pressed: { type: 'boolean', optional: false },
				tone: {
					type: 'literals',
					values: ['false', 'loud', 'quiet', 'true'],
					optional: true,
				},
			},
		})
	})

	it('should list no props for an export that is not a component', () => {
		expect(manifest.exports.cn).toEqual({ props: {} })
		expect(manifest.exports.buttonVariants).toEqual({ props: {} })
	})

	it('should list the <Name>Icon exports of the icons entry, through its re-exports', () => {
		expect(manifest.icons).toEqual(['BellIcon', 'Trash2Icon'])
	})
})
