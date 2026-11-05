import { describe, expect, it } from 'vitest'

// testee
import { resolveComponentLink } from '../../src/component-link.js'

describe('resolveComponentLink', () => {
	describe('naming convention', () => {
		it('should link a component to the export of its name, without the Components group', () => {
			expect(
				resolveComponentLink({ path: 'Components', name: 'Button', variantProperties: {} })
			).toEqual({
				kind: 'component',
				package: '@brrritscold/core-react',
				export: 'Button',
				props: {},
				unresolved: [],
			})
		})

		it('should link a compound part to its compound name joined to its own (Card/Header → CardHeader)', () => {
			expect(
				resolveComponentLink({
					path: 'Components / Card',
					name: 'Header',
					variantProperties: {},
				})
			).toMatchObject({ kind: 'component', export: 'CardHeader' })
		})

		it('should link a component under icon/ to <Name>Icon in the icons package', () => {
			expect(
				resolveComponentLink({ path: 'icon', name: 'Trash2', variantProperties: {} })
			).toEqual({
				kind: 'icon',
				package: '@brrritscold/core-react/icons',
				export: 'Trash2Icon',
			})
		})

		it('should link a component under _internal/ to nothing', () => {
			expect(
				resolveComponentLink({ path: '_internal', name: 'Slot', variantProperties: {} })
			).toEqual({ kind: 'internal' })
		})

		it('should turn variant values into props: literals as is, `default` omitted, `true` / `false` booleans', () => {
			const link = resolveComponentLink({
				path: 'Components',
				name: 'Checkbox',
				variantProperties: {
					size: 'sm',
					variant: 'default',
					checked: 'true',
					invalid: 'false',
				},
			})

			expect(link).toMatchObject({
				props: {
					size: { value: 'sm', source: 'convention' },
					variant: { value: undefined, source: 'convention' },
					checked: { value: true, source: 'convention' },
					invalid: { value: false, source: 'convention' },
				},
			})
		})
	})

	describe('exceptions record', () => {
		const button = {
			path: 'Components',
			name: 'Button',
			variantProperties: { state: 'Disabled' },
		}

		it('should set a prop from another variant property through its value map', () => {
			const link = resolveComponentLink(button, {
				v: 1,
				props: { disabled: { from: 'state', map: { Default: false, Disabled: true } } },
			})

			expect(link).toMatchObject({
				props: { disabled: { value: true, source: 'exceptions-record' } },
				unresolved: [],
			})
		})

		it('should mark a value the map does not cover as unresolved', () => {
			const link = resolveComponentLink(button, {
				v: 1,
				props: { disabled: { from: 'state', map: { Default: false } } },
			})

			expect(link).toMatchObject({
				props: {},
				unresolved: [{ variantProperty: 'state', value: 'Disabled' }],
			})
		})

		it('should link to the package the record names', () => {
			expect(
				resolveComponentLink(button, { v: 1, package: '@brrritscold/other-react' })
			).toMatchObject({ package: '@brrritscold/other-react', export: 'Button' })
		})
	})
})
