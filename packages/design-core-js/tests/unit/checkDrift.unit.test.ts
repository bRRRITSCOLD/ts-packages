import { describe, expect, it } from 'vitest'

// testee
import { checkDrift } from '../../src/drift-check.js'
import type { LibraryComponent } from '../../src/library-snapshot.js'
// fixtures
import {
	createCodeManifest,
	createDriftCheckInput,
	createInStepLibrary,
	createLibraryComponent,
	createLibraryLayer,
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
			expect(checkDrift(createDriftCheckInput(createInStepLibrary())).errors).toEqual([])
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
			const library = {
				...createInStepLibrary(),
				'button-loading': button(
					{ variant: 'default', size: 'default', state: 'Loading' },
					mapsStateToDisabled
				),
			}

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

	describe('rule 3: compound parts are library component copies', () => {
		const card = (parts: LibraryComponent['parts']) => ({
			...createInStepLibrary(),
			card: createLibraryComponent({ name: 'Card', parts }),
		})

		it('should pass a part that is a copy of a library component', () => {
			const library = card({ Header: { componentId: 'card-header' } })

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([])
		})

		it('should fail a part that is a plain layer', () => {
			const library = card({ Footer: { componentId: null } })

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 3,
					component: 'Components/Card',
					expected: 'part `Footer` a copy of a library component',
					found: 'a plain layer',
				},
			])
		})

		it('should fail a part that is a copy of a component outside the library', () => {
			const library = card({ Footer: { componentId: 'local-footer' } })

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 3,
					component: 'Components/Card',
					expected: 'part `Footer` a copy of a library component',
					found: 'a copy of `local-footer`, not in the library',
				},
			])
		})
	})

	describe('rule 5: exceptions record valid, keys point at real props, values and roles', () => {
		const withButtonRecord = (exceptionsRecord: unknown) => {
			const library = createInStepLibrary()
			for (const id of ['button-default', 'button-outline-sm-disabled'])
				library[id] = { ...library[id], exceptionsRecord }
			return library
		}

		it('should pass value maps, slots and a package that point at real things', () => {
			const library = {
				...createInStepLibrary(),
				'date-picker': createLibraryComponent({
					name: 'DatePicker',
					exceptionsRecord: { v: 1, package: '@brrritscold/other-react' },
				}),
			}

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([])
		})

		it('should fail a record that does not match the schema', () => {
			const library = {
				...createInStepLibrary(),
				'card-content': createLibraryComponent({
					path: 'Components/Card',
					name: 'Content',
					parts: { Body: { componentId: 'slot' } },
					exceptionsRecord: { v: 1, slot: ['Body'] },
				}),
			}

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 5,
					component: 'Components/Card/Content',
					expected: 'an exceptions record matching its schema',
					found: 'Unrecognized key: "slot"',
				},
			])
		})

		it('should fail a value map keyed by a prop the export does not have', () => {
			const library = withButtonRecord({
				v: 1,
				props: { disabld: { from: 'state', map: { Default: false, Disabled: true } } },
			})

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 5,
					component: 'Components/Button',
					expected: '`props` keys → props of `Button`',
					found: '`disabld`: no such prop',
				},
			])
		})

		it('should fail a value map from a variant property the component does not have', () => {
			const library = withButtonRecord({
				v: 1,
				props: { disabled: { from: 'status', map: { Default: false, Disabled: true } } },
			})

			expect(checkDrift(createDriftCheckInput(library)).errors).toContainEqual({
				rule: 5,
				component: 'Components/Button',
				expected: '`props.disabled.from` → a variant property of `Components/Button`',
				found: '`status`: no such variant property',
			})
		})

		it('should fail a value map keyed by a value the variant property never takes', () => {
			const library = withButtonRecord({
				v: 1,
				props: {
					disabled: {
						from: 'state',
						map: { Default: false, Disabled: true, Busy: true },
					},
				},
			})

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 5,
					component: 'Components/Button',
					expected: '`props.disabled.map` keys → values of `state`',
					found: '`Busy`: no such value',
				},
			])
		})

		it('should fail a slot naming a role the component has no part for', () => {
			const library = {
				...createInStepLibrary(),
				'card-content': createLibraryComponent({
					path: 'Components/Card',
					name: 'Content',
					parts: { Body: { componentId: 'slot' } },
					exceptionsRecord: { v: 1, slots: ['Footer'] },
				}),
			}

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 5,
					component: 'Components/Card/Content',
					expected: '`slots` → roles of the parts',
					found: '`Footer`: no such role',
				},
			])
		})

		it('should report a component whose record names another package as unchecked, not as drift', () => {
			const library = {
				'date-picker': createLibraryComponent({
					name: 'DatePicker',
					variantProperties: { mode: 'range' },
					exceptionsRecord: { v: 1, package: '@brrritscold/other-react' },
				}),
			}

			expect(checkDrift(createDriftCheckInput(library))).toMatchObject({
				errors: [],
				unchecked: [
					{ component: 'Components/DatePicker', package: '@brrritscold/other-react' },
				],
			})
		})
	})

	describe('rule 6: token catalog equals tokens.json', () => {
		const RESYNC = '(re-run token sync)'

		it('should pass a catalog with the sets, themes and values of tokens.json, whatever its key order', () => {
			const input = createDriftCheckInput()
			const shadow = input.snapshot.tokens.primitive.shadow as Record<string, unknown>
			shadow.xs = {
				$value: {
					spread: '0px',
					blur: '2px',
					offsetY: '1px',
					offsetX: '0px',
					color: '#0000000d',
				},
				$type: 'shadow',
			}

			expect(checkDrift(input).errors).toEqual([])
		})

		it('should fail a token whose value differs', () => {
			const input = createDriftCheckInput()
			input.snapshot.tokens.light.primary = { $type: 'color', $value: '{color.neutral.100}' }

			expect(checkDrift(input).errors).toEqual([
				{
					rule: 6,
					component: 'Token catalog',
					expected: `\`light\` token \`primary\` = color "{color.neutral.900}" ${RESYNC}`,
					found: 'color "{color.neutral.100}"',
				},
			])
		})

		it('should fail a token tokens.json has and the catalog lacks, and one it has extra', () => {
			const input = createDriftCheckInput()
			delete input.snapshot.tokens.dark['primary-foreground']
			input.snapshot.tokens.dark.secondary = { $type: 'color', $value: '#ffffff' }

			expect(checkDrift(input).errors).toEqual([
				{
					rule: 6,
					component: 'Token catalog',
					expected: `\`dark\` token \`primary-foreground\` = color "{color.neutral.900}" ${RESYNC}`,
					found: 'no such token',
				},
				{
					rule: 6,
					component: 'Token catalog',
					expected: `no \`dark\` token \`secondary\`, as in tokens.json ${RESYNC}`,
					found: 'color "#ffffff"',
				},
			])
		})

		it('should fail a missing set and an extra one', () => {
			const input = createDriftCheckInput()
			delete (input.snapshot.tokens as Record<string, unknown>).dark
			input.snapshot.tokens.brand = {}

			expect(checkDrift(input).errors).toEqual([
				{
					rule: 6,
					component: 'Token catalog',
					expected: `only the sets of tokens.json (dark, light, primitive) ${RESYNC}`,
					found: 'set `brand`',
				},
				{
					rule: 6,
					component: 'Token catalog',
					expected: `set \`dark\` ${RESYNC}`,
					found: 'no such set',
				},
			])
		})

		it('should fail a missing theme, an extra one and one enabling other sets', () => {
			const input = createDriftCheckInput()
			input.snapshot.tokenThemes = [
				{ group: 'Brand', name: 'Loud', sets: ['primitive'] },
				{ group: 'Mode', name: 'Light', sets: ['light'] },
			]

			expect(checkDrift(input).errors).toEqual([
				{
					rule: 6,
					component: 'Token catalog',
					expected: `only the themes Mode/Dark, Mode/Light ${RESYNC}`,
					found: 'theme `Brand/Loud`',
				},
				{
					rule: 6,
					component: 'Token catalog',
					expected: `theme \`Mode/Dark\` enabling dark, primitive ${RESYNC}`,
					found: 'no such theme',
				},
				{
					rule: 6,
					component: 'Token catalog',
					expected: `theme \`Mode/Light\` enabling light, primitive ${RESYNC}`,
					found: 'enabling light',
				},
			])
		})
	})

	describe('rule 7: unbound', () => {
		it('should pass layers whose checked attributes all carry a token', () => {
			expect(checkDrift(createDriftCheckInput()).errors).toEqual([])
		})

		it('should fail a layer with an unbound attribute, naming it by name path and id', () => {
			const library = {
				badge: createLibraryComponent({
					name: 'Card',
					layers: {
						'card-title': createLibraryLayer({
							namePath: ['Card', 'Title'],
							unbound: ['fill', 'font-size'],
						}),
					},
				}),
			}

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 7,
					component: 'Components/Card',
					expected: 'a token on `fill`, `font-size` of layer `Card / Title` (card-title)',
					found: 'a raw value',
				},
			])
		})
	})

	describe('rule 8: unknown token', () => {
		const card = (appliedTokens: Record<string, string>) => ({
			card: createLibraryComponent({
				name: 'Card',
				layers: { 'card-board': createLibraryLayer({ namePath: ['Card'], appliedTokens }) },
			}),
		})

		it('should pass applied tokens from any set of tokens.json', () => {
			const library = card({ fill: 'primary', shadow: 'shadow.xs' })

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([])
		})

		it('should fail an applied token tokens.json does not have', () => {
			const library = card({ fill: 'brand.primary' })

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 8,
					component: 'Components/Card',
					expected: 'a token of tokens.json on `fill` of layer `Card` (card-board)',
					found: '`brand.primary`: no such token',
				},
			])
		})
	})

	describe('rule 9: primitive colour on fill or stroke', () => {
		const card = (appliedTokens: Record<string, string>) => ({
			card: createLibraryComponent({
				name: 'Card',
				layers: { 'card-board': createLibraryLayer({ namePath: ['Card'], appliedTokens }) },
			}),
		})

		it('should pass a semantic colour on fill and stroke, and a primitive on other attributes', () => {
			const library = card({
				fill: 'primary',
				'stroke-color': 'primary-foreground',
				r1: 'border-radius.lg',
			})

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([])
		})

		it('should fail a primitive colour on fill and on stroke colour', () => {
			const library = card({ fill: 'color.neutral.100', 'stroke-color': 'color.white' })

			expect(checkDrift(createDriftCheckInput(library)).errors).toEqual([
				{
					rule: 9,
					component: 'Components/Card',
					expected: 'a semantic colour on `fill` of layer `Card` (card-board)',
					found: 'the primitive `color.neutral.100`',
				},
				{
					rule: 9,
					component: 'Components/Card',
					expected: 'a semantic colour on `stroke-color` of layer `Card` (card-board)',
					found: 'the primitive `color.white`',
				},
			])
		})
	})

	describe('coverage report: code → library', () => {
		it('should report an export no library component links to as a coverage gap, not an error', () => {
			const manifest = createCodeManifest()
			manifest.exports.Badge = { props: {} }

			expect(
				checkDrift(createDriftCheckInput(createInStepLibrary(), manifest))
			).toMatchObject({
				errors: [],
				coverageGaps: [{ export: 'Badge' }],
			})
		})

		it('should not report an allowlisted export', () => {
			const manifest = createCodeManifest()
			manifest.exports.Toaster = { props: {} }
			const input = createDriftCheckInput(createInStepLibrary(), manifest)
			input.config.allowlist.push('Toaster')

			expect(checkDrift(input).coverageGaps).toEqual([])
		})

		it('should report a literal of a prop the library sets that no variant uses', () => {
			const manifest = createCodeManifest()
			manifest.exports.Button.props.variant = {
				type: 'literals',
				values: ['default', 'outline', 'secondary'],
				optional: true,
			}

			expect(
				checkDrift(createDriftCheckInput(createInStepLibrary(), manifest)).coverageGaps
			).toEqual([{ export: 'Button', prop: 'variant', value: 'secondary' }])
		})
	})
})
