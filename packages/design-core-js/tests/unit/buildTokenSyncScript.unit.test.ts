import { describe, expect, it } from 'vitest'
// fixtures
import coreReactTokens from '../../../core-react/tokens/tokens.json' with { type: 'json' }
// testee
import { checkDrift, DRIFT_RULE } from '../../src/drift-check.js'
import { TOKEN_THEMES, type TokenFile, tokenFileSchema } from '../../src/token-file.js'
import { buildTokenSyncScript, type TokenMigration } from '../../src/token-sync.js'
import {
	createFakePenpot,
	createShape,
	createTokenFile,
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
				'replace token `primitive/color.white`',
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
				'replace token `primitive/shadow.xs`',
				'replace token `light/primary`',
			])
			expect(tokenCatalogErrors(fake)).toEqual([])
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
