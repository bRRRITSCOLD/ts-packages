import { describe, expect, it } from 'vitest'

// testee
import { checkDrift } from '../../src/drift-check.js'
// fixtures
import {
	createCodeManifest,
	createDriftCheckInput,
	createInStepLibrary,
	createLibraryComponent,
	mapsStateToDisabled,
} from './__fixtures__/checkDrift.unit.fixtures.js'

describe('checkDrift', () => {
	it('should report no errors, unchecked components or coverage gaps for a library in step with the code', () => {
		expect(checkDrift(createDriftCheckInput())).toEqual({
			errors: [],
			unchecked: [],
			coverageGaps: [],
		})
	})

	describe('rule 1: component name → named export', () => {
		it('should pass a component whose name, path stripped, is an export', () => {
			const library = { card: createLibraryComponent({ path: 'Components', name: 'Card' }) }

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([])
		})

		it('should fail a component with no export of its name', () => {
			const library = {
				...createInStepLibrary(),
				badge: createLibraryComponent({ name: 'Badge' }),
			}

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 1,
					component: 'Components/Badge',
					expected: 'export `Badge` in @brrritscold/core-react',
					found: 'no such export',
				},
			])
		})
	})

	describe('rule 4: icon component → <Name>Icon', () => {
		it('should pass an icon whose <Name>Icon is in ./icons', () => {
			const library = { trash: createLibraryComponent({ path: 'icon', name: 'Trash2' }) }

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([])
		})

		it('should fail an icon with no <Name>Icon in ./icons', () => {
			const library = {
				...createInStepLibrary(),
				envelope: createLibraryComponent({ path: 'icon', name: 'Envelope' }),
			}

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 4,
					component: 'icon/Envelope',
					expected: 'export `EnvelopeIcon` in @brrritscold/core-react/icons',
					found: 'no such icon',
				},
			])
		})
	})

	describe('rule 2: variant property → prop, value → literal', () => {
		const button = (variantProperties: Record<string, string>, exceptionsRecord?: unknown) =>
			createLibraryComponent({ name: 'Button', variantProperties, exceptionsRecord })

		it('should pass literal values, `default` on an optional prop and values the exceptions record maps', () => {
			const library = {
				'button-outline': button({ variant: 'outline', size: 'default' }),
				'button-disabled': button({ state: 'Disabled' }, mapsStateToDisabled),
			}

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([])
		})

		it('should fail a value that is not a literal of the prop', () => {
			const library = { button: button({ variant: 'ghost' }) }

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 2,
					component: 'Components/Button',
					expected: '`variant` one of "default" | "outline"',
					found: '"ghost"',
				},
			])
		})

		it('should fail a variant property with no boolean or literal-union prop of its name', () => {
			const library = { button: button({ tone: 'loud' }) }

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 2,
					component: 'Components/Button',
					expected: 'prop `tone` (boolean or literal union) on `Button`',
					found: 'no such prop',
				},
			])
		})

		it('should fail `default` on a required prop, since `default` omits it', () => {
			const manifest = createCodeManifest()
			manifest.exports.Button.props.size = {
				type: 'literals',
				values: ['default', 'sm'],
				optional: false,
			}

			expect(
				checkDrift(createDriftCheckInput({ button: button({ size: 'default' }) }, manifest))
					.errors
			).toEqual([
				{
					rule: 2,
					component: 'Components/Button',
					expected: '`size` optional (the variant value `default` omits it)',
					found: 'required',
				},
			])
		})

		it('should fail a mapped value that is not a boolean for a boolean prop', () => {
			const library = {
				button: button(
					{ state: 'Disabled' },
					{ v: 1, props: { disabled: { from: 'state', map: { Disabled: 'yes' } } } }
				),
			}

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 2,
					component: 'Components/Button',
					expected: '`disabled` true | false',
					found: '"yes"',
				},
			])
		})

		it('should fail a value the exceptions record maps the property of but not the value', () => {
			const library = { button: button({ state: 'Loading' }, mapsStateToDisabled) }

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 2,
					component: 'Components/Button',
					expected: 'an exceptions record value for `state` = `Loading`',
					found: 'no such value in the map',
				},
			])
		})

		it('should report a mismatch shared by several variants once', () => {
			const library = {
				'button-a': createLibraryComponent({
					name: 'Button',
					variantProperties: { variant: 'ghost', size: 'default' },
				}),
				'button-b': createLibraryComponent({
					name: 'Button',
					variantProperties: { variant: 'ghost', size: 'sm' },
				}),
			}

			expect(checkDrift(createDriftCheckInput(library)).errors).toHaveLength(1)
		})
	})
})
