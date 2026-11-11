import { describe, expect, it } from 'vitest'
// fixtures
import coreReactTokens from '../../../core-react/tokens/tokens.json' with { type: 'json' }
// testee
import { checkDrift, DRIFT_RULE } from '../../src/drift-check.js'
import {
	type DesignTokenGroup,
	TOKEN_THEMES,
	type TokenFile,
	tokenFileSchema,
} from '../../src/token-file.js'
import { buildTokenSyncScript, type TokenMigration } from '../../src/token-sync.js'
import {
	createFakePenpot,
	createShape,
	createTokenFile,
	type FakeBehaviour,
	type FakeFileState,
	readCatalog,
	runScript,
} from './__fixtures__/buildTokenSyncScript.unit.fixtures.js'

const sync = (
	fake: ReturnType<typeof createFakePenpot>,
	migrations: TokenMigration[] = [],
	tokens: TokenFile = createTokenFile()
) => runScript(buildTokenSyncScript({ tokens, migrations, pauseMs: 0 }), fake)

/** Drift rule 6's errors for the fake file's catalog against a token file. */
const tokenCatalogErrors = (
	fake: ReturnType<typeof createFakePenpot>,
	tokens: TokenFile = createTokenFile()
) => {
	const { tokens: catalog, tokenThemes } = readCatalog(fake)
	return checkDrift({
		snapshot: {
			schemaVersion: 3,
			penpotVersion: '2.18.6',
			libraryFileId: 'file',
			tokens: catalog,
			tokenThemes,
			components: {},
		},
		manifest: { exports: {}, icons: [] },
		tokens,
		config: { allowlist: [] },
	}).errors.filter(({ rule }) => rule === DRIFT_RULE.tokenCatalog)
}

/** A file synced from the fixture token file, starting from `state`. */
const syncedFile = async (state: FakeFileState = {}) => {
	const fake = createFakePenpot(state)
	await sync(fake)
	return fake
}

describe('buildTokenSyncScript', () => {
	describe('on an empty file', () => {
		it('should write the full catalog, which drift rule 6 then passes', async () => {
			const fake = createFakePenpot()

			const { changes, flagged } = await sync(fake)

			expect(tokenCatalogErrors(fake)).toEqual([])
			expect(readCatalog(fake).setOrder).toEqual(['primitive', 'light', 'dark'])
			expect(readCatalog(fake).activeThemes).toEqual(['Mode/Light'])
			expect(changes).toEqual([
				'add set `primitive`',
				'add set `light`',
				'add set `dark`',
				'add token `primitive/color.white`',
				'add token `primitive/color.neutral.900`',
				'add token `primitive/font-family.sans`',
				'add token `primitive/font-weight.medium`',
				'add token `primitive/shadow.xs`',
				'add token `primitive/shadow.sm`',
				'add token `light/primary`',
				'add token `dark/primary`',
				'add theme `Mode/Dark`',
				'add theme `Mode/Light`',
				'theme `Mode/Dark`: enable set `dark`',
				'theme `Mode/Dark`: enable set `primitive`',
				'theme `Mode/Light`: enable set `light`',
				'theme `Mode/Light`: enable set `primitive`',
				'activate theme `Mode/Light`',
			])
			expect(flagged).toEqual([])
		})

		it('should make no change on a second run, though Penpot rewrote numbers, font families and shadows', async () => {
			const fake = await syncedFile()
			fake.writes = 0

			expect(await sync(fake)).toEqual({ changes: [], flagged: [] })
			expect(fake.writes).toBe(0)
		})
	})

	describe('on a file that drifted', () => {
		const drifted = (): FakeFileState => ({
			sets: [
				{
					name: 'primitive',
					tokens: {
						'color.white': { type: 'color', value: '#fefefe' },
						'color.neutral.900': { type: 'color', value: '#171717' },
						'color.stray': { type: 'color', value: '#123456' },
					},
				},
				{ name: 'light', tokens: {} },
				{ name: 'dark', tokens: {} },
				{ name: 'brand', tokens: { accent: { type: 'color', value: '#ff00ff' } } },
			],
			themes: [
				{ group: 'Mode', name: 'Light', sets: ['light', 'brand'], active: false },
				{ group: 'Mode', name: 'Dark', sets: ['dark', 'primitive'] },
				{ group: 'Brand', name: 'Loud', sets: ['brand'], active: true },
			],
		})

		it('should fix a changed value, an extra token, an extra set, an extra theme and wrong theme sets', async () => {
			const fake = createFakePenpot(drifted())

			const { changes } = await sync(fake)

			expect(tokenCatalogErrors(fake)).toEqual([])
			expect(readCatalog(fake).activeThemes).toEqual(['Mode/Light'])
			expect(changes).toEqual([
				'remove token `primitive/color.stray`',
				'update token `primitive/color.white`',
				'add token `primitive/font-family.sans`',
				'add token `primitive/font-weight.medium`',
				'add token `primitive/shadow.xs`',
				'add token `primitive/shadow.sm`',
				'add token `light/primary`',
				'add token `dark/primary`',
				'remove set `brand`',
				'remove theme `Brand/Loud`',
				'theme `Mode/Light`: enable set `primitive`',
				'activate theme `Mode/Light`',
			])
		})

		it('should leave the active Mode theme alone', async () => {
			const fake = await syncedFile({
				themes: [{ group: 'Mode', name: 'Dark', sets: [], active: true }],
			})

			expect(readCatalog(fake).activeThemes).toEqual(['Mode/Dark'])
		})

		it('should make no change on a second run', async () => {
			const fake = createFakePenpot(drifted())
			await sync(fake)

			expect(await sync(fake)).toEqual({ changes: [], flagged: [] })
		})

		it('should compare with drift rule 6: a description or an inset shadow is a change', async () => {
			const fake = await syncedFile()
			const { sets } = fake.penpot.library.local.tokens
			const lightPrimary = sets[1].tokens[0]
			lightPrimary.description = 'Something else'
			const xs = sets[0].tokens.find(({ name }) => name === 'shadow.xs')
			;(xs?.value as { inset: boolean }[])[0].inset = true

			expect(tokenCatalogErrors(fake)).toHaveLength(2)
			expect((await sync(fake)).changes).toEqual([
				'update token `primitive/shadow.xs`',
				'update token `light/primary`',
			])
			expect(tokenCatalogErrors(fake)).toEqual([])
		})
	})

	describe('a token whose value changed', () => {
		/** The fixture token file with `font-family.sans` changed, as #119 changed it. */
		const withNewSans = (): TokenFile => {
			const tokens = createTokenFile()
			tokens.primitive['font-family'] = {
				sans: {
					$type: 'fontFamilies',
					$value: 'Inter, ui-sans-serif, system-ui, sans-serif',
				},
			}
			return tokens
		}
		const OLD_SANS = ['ui-sans-serif', 'system-ui']
		const NEW_SANS = ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
		const sansToken = (fake: ReturnType<typeof createFakePenpot>) =>
			fake.penpot.library.local.tokens.sets[0].tokens.find(
				({ name }) => name === 'font-family.sans'
			)

		/** A file synced from the fixture token file, then set to misbehave. */
		const syncedThen = async (state: FakeFileState, behaviour: FakeBehaviour) => {
			const fake = await syncedFile(state)
			fake.behaviour = behaviour
			return fake
		}

		it('should set the new value on the token in place, and make no change on a second run', async () => {
			const fake = await syncedFile()
			const before = sansToken(fake)

			const { changes } = await sync(fake, [], withNewSans())

			expect(changes).toEqual(['update token `primitive/font-family.sans`'])
			expect(sansToken(fake)).toBe(before)
			expect(before?.value).toEqual(NEW_SANS)
			expect(tokenCatalogErrors(fake, withNewSans())).toEqual([])
			expect(await sync(fake, [], withNewSans())).toEqual({ changes: [], flagged: [] })
		})

		it('should re-apply it on every shape applying it, copies last, so each resolves the new value', async () => {
			const copy = createShape(
				'Title copy',
				{ 'font-family': 'font-family.sans' },
				{ copy: true, resolved: { 'font-family': OLD_SANS } }
			)
			const main = createShape(
				'Title',
				{ 'font-family': 'font-family.sans', 'font-weight': 'font-weight.medium' },
				{ resolved: { 'font-family': OLD_SANS, 'font-weight': '500' } }
			)
			const root = createShape('Root', {}, { children: [copy, main] })
			const fake = await syncedFile({ pages: [{ name: 'Screens', root }] })

			const { changes, flagged } = await sync(fake, [], withNewSans())

			expect(changes).toEqual([
				'update token `primitive/font-family.sans`',
				're-apply `font-family.sans` on font-family of `Title` (shape-Title) on page `Screens`',
				're-apply `font-family.sans` on font-family of `Title copy` (shape-Title copy) on page `Screens`',
			])
			expect(flagged).toEqual([])
			for (const shape of [main, copy]) {
				expect(shape.tokens['font-family']).toBe('font-family.sans')
				expect(shape.resolved['font-family']).toEqual(NEW_SANS)
			}
			expect(main.resolved['font-weight']).toBe('500')
			expect(await sync(fake, [], withNewSans())).toEqual({ changes: [], flagged: [] })
		})

		it('should re-apply the tokens that reference a changed token too', async () => {
			const tokens = createTokenFile()
			tokens.primitive.color = {
				white: { $type: 'color', $value: '#ffffff' },
				neutral: { 900: { $type: 'color', $value: '#0a0a0a' } },
			}
			const button = createShape('Button', { fill: 'primary' })
			const text = createShape('Text', { fill: 'color.white' })
			const fake = await syncedFile({
				pages: [
					{
						name: 'Screens',
						root: createShape('Root', {}, { children: [button, text] }),
					},
				],
			})

			const { changes } = await sync(fake, [], tokens)

			expect(changes).toEqual([
				'update token `primitive/color.neutral.900`',
				're-apply `primary` on fill of `Button` (shape-Button) on page `Screens`',
			])
			expect(button.resolved.fill).toBe('{color.neutral.900}')
			expect(text.resolved).toEqual({})
		})

		it('should set a number as a string and a single shadow as a list of layers, as the plugin typings declare', async () => {
			const fake = await syncedFile()
			const assigned: unknown[] = []
			for (const token of fake.penpot.library.local.tokens.sets[0].tokens) {
				const descriptor = Object.getOwnPropertyDescriptor(token, 'value')
				Object.defineProperty(token, 'value', {
					get: descriptor?.get,
					set(next) {
						assigned.push(next)
						descriptor?.set?.call(token, next)
					},
				})
			}
			const tokens = createTokenFile()
			tokens.primitive['font-weight'] = { medium: { $type: 'fontWeights', $value: 600 } }
			const xs = {
				color: '#00000014',
				offsetX: '0px',
				offsetY: '1px',
				blur: '2px',
				spread: '0px',
			}
			;(tokens.primitive.shadow as DesignTokenGroup).xs = { $type: 'shadow', $value: xs }

			const { changes } = await sync(fake, [], tokens)

			expect(changes).toEqual([
				'update token `primitive/font-weight.medium`',
				'update token `primitive/shadow.xs`',
			])
			expect(assigned).toEqual(['600', [xs]])
		})

		it('should not re-apply a token whose description alone changed', async () => {
			const button = createShape('Button', { fill: 'primary' })
			const fake = await syncedFile({ pages: [{ name: 'Screens', root: button }] })
			const tokens = createTokenFile()
			tokens.light.primary.$description = 'Main action fill'

			const { changes } = await sync(fake, [], tokens)

			expect(changes).toEqual(['update token `light/primary`'])
			expect(button.resolved).toEqual({})
		})

		it('should flag a shape whose re-applied token does not read back', async () => {
			const title = createShape(
				'Title',
				{ 'font-family': 'font-family.sans' },
				{ racy: true }
			)
			const fake = await syncedFile({ pages: [{ name: 'Screens', root: title }] })

			const { changes, flagged } = await sync(fake, [], withNewSans())

			expect(changes).toEqual(['update token `primitive/font-family.sans`'])
			expect(flagged).toEqual([
				{
					page: 'Screens',
					shapeId: 'shape-Title',
					shape: 'Title',
					token: 'font-family.sans',
					properties: ['font-family'],
					reason: '`font-family.sans` changed value and re-applying it did not read back: apply it again on font-family',
				},
			])
		})

		describe('when Penpot will not set the value in place', () => {
			it.each([
				['refuses the assignment', 'throws'],
				['ignores the assignment', 'ignored'],
			] as const)(
				'should remove and add the token again when Penpot %s',
				async (_, valueSetter) => {
					const title = createShape('Title', { 'font-family': 'font-family.sans' })
					const fake = await syncedThen(
						{ pages: [{ name: 'Screens', root: title }] },
						{ valueSetter }
					)

					const { changes } = await sync(fake, [], withNewSans())

					expect(changes).toEqual([
						'replace token `primitive/font-family.sans`',
						're-apply `font-family.sans` on font-family of `Title` (shape-Title) on page `Screens`',
					])
					expect(sansToken(fake)?.value).toEqual(NEW_SANS)
					expect(title.resolved['font-family']).toEqual(NEW_SANS)
					expect(await sync(fake, [], withNewSans())).toEqual({
						changes: [],
						flagged: [],
					})
				}
			)

			it('should replace a token whose type changed', async () => {
				const fake = await syncedFile({
					sets: [
						{
							name: 'primitive',
							tokens: { 'font-weight.medium': { type: 'number', value: '500' } },
						},
					],
				})

				expect(readCatalog(fake).tokens.primitive['font-weight']).toEqual({
					medium: { $type: 'fontWeights', $value: '500' },
				})
			})

			it('should retry an add that throws once', async () => {
				let attempts = 0
				const fake = await syncedThen(
					{},
					{
						valueSetter: 'throws',
						failAdd: ({ name }) => name === 'font-family.sans' && ++attempts === 1,
					}
				)

				const { changes } = await sync(fake, [], withNewSans())

				expect(changes).toEqual(['replace token `primitive/font-family.sans`'])
				expect(sansToken(fake)?.value).toEqual(NEW_SANS)
			})

			it('should restore the removed token, sync everything else and then throw, when its add keeps failing', async () => {
				const text = createShape('Text', { fill: 'color.white' })
				const fake = await syncedThen(
					{ pages: [{ name: 'Screens', root: text }] },
					{
						valueSetter: 'throws',
						failAdd: ({ value }) =>
							value === 'Inter, ui-sans-serif, system-ui, sans-serif',
					}
				)
				const tokens = withNewSans()
				tokens.primitive.color = {
					white: { $type: 'color', $value: '#fafafa' },
					neutral: { 900: { $type: 'color', $value: '#171717' } },
				}

				const error = await sync(fake, [], tokens).catch((thrown: unknown) => thrown)

				expect((error as Error).message).toBe(
					[
						'Token sync could not replace these tokens; it synced everything else:',
						'- `primitive/font-family.sans`: adding the new value failed twice (Value not valid: Field 0.name is invalid: Empty field. Field value is invalid: Token has circular reference); the old token was restored',
						'Changes it made: ["replace token `primitive/color.white`","re-apply `color.white` on fill of `Text` (shape-Text) on page `Screens`"]',
						'Flagged shapes: []',
					].join('\n')
				)
				expect(sansToken(fake)?.value).toEqual(OLD_SANS)
				expect(text.resolved.fill).toBe('#fafafa')
			})

			it('should throw with the token to re-add by hand when restoring it fails too', async () => {
				const fake = await syncedThen(
					{},
					{ valueSetter: 'throws', failAdd: ({ name }) => name === 'font-family.sans' }
				)

				await expect(sync(fake, [], withNewSans())).rejects.toThrow(
					'and restoring the old token failed too (Value not valid: Field 0.name is invalid: Empty field. Field value is invalid: Token has circular reference). Re-add it by hand in set `primitive`: addToken({"type":"fontFamilies","name":"font-family.sans","value":"ui-sans-serif, system-ui"})'
				)
			})
		})
	})

	describe('token migrations', () => {
		/** A synced file with these pages, plus an old token in `light`. */
		const withOldToken = async (
			name: string,
			pages: NonNullable<FakeFileState['pages']>
		): Promise<ReturnType<typeof createFakePenpot>> => {
			const fake = await syncedFile({ pages })
			fake.penpot.library.local.tokens.sets[1].addToken({
				type: 'color',
				name,
				value: '#ff00ff',
			})
			return fake
		}

		it('should add `to`, re-point every shape applying `from` on the same properties, and remove `from`', async () => {
			const nested = createShape('Label', { fill: 'brand', 'stroke-color': 'brand' })
			const card = createShape(
				'Card',
				{ fill: 'brand', r1: 'radius' },
				{ children: [nested] }
			)
			const fake = await withOldToken('brand', [
				{ name: 'Cover', root: createShape('Root') },
				{ name: 'Screens', root: createShape('Root', {}, { children: [card] }) },
			])

			const { changes, flagged } = await sync(fake, [
				{ version: '2.0.0', from: 'brand', to: 'primary' },
			])

			expect(card.tokens).toEqual({ fill: 'primary', r1: 'radius' })
			expect(nested.tokens).toEqual({ fill: 'primary', 'stroke-color': 'primary' })
			expect(changes).toEqual([
				're-point `brand` → `primary` on fill of `Card` (shape-Card) on page `Screens`',
				're-point `brand` → `primary` on fill, stroke-color of `Label` (shape-Label) on page `Screens`',
				'remove migrated token `light/brand`',
			])
			expect(flagged).toEqual([])
			expect(tokenCatalogErrors(fake)).toEqual([])
			expect(await sync(fake, [{ version: '2.0.0', from: 'brand', to: 'primary' }])).toEqual({
				changes: [],
				flagged: [],
			})
		})

		it('should follow a chain of renames to the token tokens.json has', async () => {
			const card = createShape('Card', { fill: 'brand' })
			const fake = await withOldToken('brand', [{ name: 'Screens', root: card }])

			await sync(fake, [
				{ version: '2.0.0', from: 'brand', to: 'accent' },
				{ version: '3.0.0', from: 'accent', to: 'primary' },
			])

			expect(card.tokens).toEqual({ fill: 'primary' })
		})

		it('should keep `from` and flag the shapes that still apply it', async () => {
			const card = createShape('Card', { fill: 'brand' }, { stubborn: true })
			const fake = await withOldToken('brand', [{ name: 'Screens', root: card }])

			const { flagged } = await sync(fake, [
				{ version: '2.0.0', from: 'brand', to: 'primary' },
			])

			expect(flagged).toEqual([
				{
					page: 'Screens',
					shapeId: 'shape-Card',
					shape: 'Card',
					token: 'brand',
					properties: ['fill'],
					reason: 'still applies `brand` after re-pointing it to `primary`',
				},
			])
			expect(readCatalog(fake).tokens.light).toHaveProperty('brand')
		})

		it('should flag the shapes applying a `from` migrated to null, and keep it', async () => {
			const card = createShape('Card', { fill: 'brand' })
			const fake = await withOldToken('brand', [{ name: 'Screens', root: card }])
			const migrations = [{ version: '2.0.0', from: 'brand', to: null }]

			const { changes, flagged } = await sync(fake, migrations)

			expect(changes).toEqual([])
			expect(flagged).toEqual([
				expect.objectContaining({
					shape: 'Card',
					token: 'brand',
					reason: '`brand` was removed with no replacement',
				}),
			])
			expect(card.tokens).toEqual({ fill: 'brand' })
			expect(readCatalog(fake).tokens.light).toHaveProperty('brand')
		})

		it('should remove a `from` migrated to null that no shape applies', async () => {
			const fake = await withOldToken('brand', [
				{ name: 'Screens', root: createShape('Card') },
			])

			const { changes } = await sync(fake, [{ version: '2.0.0', from: 'brand', to: null }])

			expect(changes).toEqual(['remove migrated token `light/brand`'])
		})

		it('should skip a migration whose `from` is a token of tokens.json again', async () => {
			const card = createShape('Card', { fill: 'primary' })
			const fake = await syncedFile({ pages: [{ name: 'Screens', root: card }] })

			const result = await sync(fake, [{ version: '2.0.0', from: 'primary', to: null }])

			expect(result).toEqual({ changes: [], flagged: [] })
		})

		it('should throw when `to` is not in tokens.json and no later migration renames it', () => {
			expect(() =>
				buildTokenSyncScript({
					tokens: createTokenFile(),
					migrations: [{ version: '2.0.0', from: 'brand', to: 'accent' }],
				})
			).toThrow('`accent` is not in tokens.json and no later migration renames it')
		})
	})

	describe('tokens Penpot cannot hold', () => {
		it('should throw on a negative shadow spread before any script exists', () => {
			const tokens = createTokenFile()
			tokens.primitive.shadow = {
				inner: {
					$type: 'shadow',
					$value: {
						color: '#000',
						offsetX: '0px',
						offsetY: '0px',
						blur: '1px',
						spread: '-1px',
					},
				},
			}

			expect(() => buildTokenSyncScript({ tokens })).toThrow(
				"Penpot can't hold these tokens of tokens.json:\n`primitive/shadow.inner`: a negative shadow spread, which Penpot rejects"
			)
		})

		it('should throw on a CSS-string shadow, and accept a shadow that references another', () => {
			const tokens = createTokenFile()
			tokens.light.elevation = { $type: 'shadow', $value: '{shadow.xs}' }
			tokens.dark.elevation = { $type: 'shadow', $value: '0 1px 2px #000' }

			expect(() => buildTokenSyncScript({ tokens })).toThrow(
				/^Penpot can't hold these tokens of tokens.json:\n`dark\/elevation`: a CSS-string shadow/
			)
		})
	})

	describe("core-react's tokens.json", () => {
		const tokens = tokenFileSchema.parse(coreReactTokens)

		it('should write a catalog drift rule 6 passes, with the Mode themes, and make no change on a second run', async () => {
			const fake = createFakePenpot()

			await runScript(buildTokenSyncScript({ tokens, pauseMs: 0 }), fake)

			expect(tokenCatalogErrors(fake, tokens)).toEqual([])
			expect(readCatalog(fake).tokenThemes).toEqual(TOKEN_THEMES)
			expect(await runScript(buildTokenSyncScript({ tokens, pauseMs: 0 }), fake)).toEqual({
				changes: [],
				flagged: [],
			})
		})
	})
})
