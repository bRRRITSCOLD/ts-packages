import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
// node_modules
import { buildTokenSyncScript } from '@brrritscold/design-core-js/token-sync'
import { describe, expect, it } from 'vitest'

// testee
import { type DriftCliIo, runDriftCli } from '../../src/drift-check.js'

const fixture = (file: string) => fileURLToPath(new URL(`./__fixtures__/${file}`, import.meta.url))

const DESIGN_FIXTURES = [
	'library.snapshot.json',
	'library.drifted.snapshot.json',
	'tokens.json',
	'token-migrations.json',
	'drift.config.json',
]
const MANIFEST = 'code-manifest.json'
const STEP_SUMMARY = 'step-summary.md'

/**
 * The CLI over an in-memory file system preloaded with the design fixtures: what it writes
 * stays in `files`, and its output is captured. The code manifest generator reads the fixture
 * `.d.ts` itself.
 */
const cli = () => {
	const files = new Map(
		DESIGN_FIXTURES.map((file) => [
			fixture(`design/${file}`),
			readFileSync(fixture(`design/${file}`), 'utf8'),
		])
	)
	const stdout: string[] = []
	const stderr: string[] = []
	const io: DriftCliIo = {
		stdout: (line) => stdout.push(line),
		stderr: (line) => stderr.push(line),
		env: { GITHUB_STEP_SUMMARY: STEP_SUMMARY },
		readFile: (path) => {
			const text = files.get(path)
			if (text === undefined) throw new Error(`ENOENT: no such file, open '${path}'`)
			return text
		},
		writeFile: (path, text) => {
			files.set(path, text)
		},
		appendFile: (path, text) => {
			files.set(path, (files.get(path) ?? '') + text)
		},
	}
	const run = (...argv: string[]) => runDriftCli(argv, io)
	return { files, stdout, stderr, run }
}

/** The CLI with the code manifest of the fixture `.d.ts` already written to `code-manifest.json`. */
const cliWithManifest = () => {
	const drift = cli()
	const exitCode = drift.run(
		'manifest',
		'--entry',
		fixture('core-react/index.d.ts'),
		'--icons',
		fixture('core-react/icons.d.ts'),
		'--out',
		MANIFEST
	)
	expect(exitCode).toBe(0)
	return drift
}

/** Runs `check` on a snapshot fixture against the fixture manifest and config. */
const check = (snapshot: string) => {
	const drift = cliWithManifest()
	const exitCode = drift.run(
		'check',
		'--manifest',
		MANIFEST,
		'--snapshot',
		fixture(`design/${snapshot}`),
		'--tokens',
		fixture('design/tokens.json'),
		'--config',
		fixture('design/drift.config.json')
	)
	return { ...drift, exitCode, summary: drift.files.get(STEP_SUMMARY) }
}

describe('design-drift CLI', () => {
	describe('manifest', () => {
		it('should write the code manifest of the .d.ts as JSON', () => {
			const written = JSON.parse(cliWithManifest().files.get(MANIFEST) ?? '')

			expect(Object.keys(written.exports)).toContain('Button')
			expect(written.icons).toEqual(['BellIcon', 'Trash2Icon'])
		})
	})

	describe('check, library in step with the code', () => {
		it('should pass, with no annotation but the coverage-gap warning (exit 0)', () => {
			const { exitCode, stdout } = check('library.snapshot.json')

			expect(exitCode).toBe(0)
			expect(stdout).toEqual([
				'::warning title=Drift check%3A coverage gaps::1 export or prop value of core-react has no counterpart in the design system library: Toggle',
			])
		})

		it('should say there is no drift, with the coverage gaps collapsed', () => {
			const { summary } = check('library.snapshot.json')

			expect(summary).toBe(
				[
					'## Drift check',
					'',
					'No drift: the design system library agrees with core-react.',
					'',
					'<details>',
					'<summary>Coverage gaps (1): in core-react, not in the design system library</summary>',
					'',
					'| Export | Prop | Value |',
					'| --- | --- | --- |',
					'| `Toggle` |  |  |',
					'',
					'</details>',
					'',
				].join('\n')
			)
		})
	})

	describe('check, library drifted from the code', () => {
		it('should fail with one error annotation per mismatch and a warning per unchecked component (exit 1)', () => {
			const { exitCode, stdout } = check('library.drifted.snapshot.json')

			expect(exitCode).toBe(1)
			expect(stdout).toEqual([
				'::error title=Drift rule 2 (variant)%3A Components/Badge::Expected `variant` one of "default" | "secondary"; found "ghost"',
				'::error title=Drift rule 8 (unknown token)%3A Components/Badge::Expected a token of tokens.json on `fill` of layer `Badge / Label` (badge-label); found `brand.foreground`: no such token',
				'::error title=Drift rule 3 (part)%3A Components/Card::Expected part `Footer` a copy of a library component; found a plain layer',
				'::error title=Drift rule 7 (unbound)%3A Components/Card::Expected a token on `fill` of layer `Card` (card-board); found a raw value',
				'::error title=Drift rule 5 (exceptions record)%3A Components/Card/Content::Expected `slots` → roles of the parts; found `Footer`: no such role',
				'::error title=Drift rule 9 (primitive colour)%3A Components/Card/Header::Expected a semantic colour on `fill` of layer `Header` (card-header-board); found the primitive `color.neutral.100`',
				'::error title=Drift rule 1 (export)%3A Components/Tag::Expected export `Tag` in @brrritscold/core-react; found no such export',
				'::error title=Drift rule 6 (token catalog)%3A Token catalog::Expected `light` token `primary` = color "{color.neutral.900}" (re-run token sync); found color "{color.neutral.100}"',
				'::error title=Drift rule 4 (icon)%3A icon/Envelope::Expected export `EnvelopeIcon` in @brrritscold/core-react/icons; found no such icon',
				'::warning title=Drift check%3A unchecked component::Components/DatePicker links to @brrritscold/other-react, which the drift check cannot check',
				'::warning title=Drift check%3A coverage gaps::1 export or prop value of core-react has no counterpart in the design system library: Toggle',
			])
		})

		it('should write a step summary table of component → rule → expected vs found', () => {
			const { summary } = check('library.drifted.snapshot.json')

			expect(summary).toBe(
				[
					'## Drift check',
					'',
					'**9 errors**: the design system library disagrees with core-react. Fix the library, then refresh the snapshot.',
					'',
					'| Component | Rule | Expected | Found |',
					'| --- | --- | --- | --- |',
					'| Components/Badge | 2 variant | `variant` one of "default" \\| "secondary" | "ghost" |',
					'| Components/Badge | 8 unknown token | a token of tokens.json on `fill` of layer `Badge / Label` (badge-label) | `brand.foreground`: no such token |',
					'| Components/Card | 3 part | part `Footer` a copy of a library component | a plain layer |',
					'| Components/Card | 7 unbound | a token on `fill` of layer `Card` (card-board) | a raw value |',
					'| Components/Card/Content | 5 exceptions record | `slots` → roles of the parts | `Footer`: no such role |',
					'| Components/Card/Header | 9 primitive colour | a semantic colour on `fill` of layer `Header` (card-header-board) | the primitive `color.neutral.100` |',
					'| Components/Tag | 1 export | export `Tag` in @brrritscold/core-react | no such export |',
					'| Token catalog | 6 token catalog | `light` token `primary` = color "{color.neutral.900}" (re-run token sync) | color "{color.neutral.100}" |',
					'| icon/Envelope | 4 icon | export `EnvelopeIcon` in @brrritscold/core-react/icons | no such icon |',
					'',
					'### Unchecked (1)',
					'',
					'Their exceptions record names another package, so the drift check cannot check them.',
					'',
					'| Component | Package |',
					'| --- | --- |',
					'| Components/DatePicker | @brrritscold/other-react |',
					'',
					'<details>',
					'<summary>Coverage gaps (1): in core-react, not in the design system library</summary>',
					'',
					'| Export | Prop | Value |',
					'| --- | --- | --- |',
					'| `Toggle` |  |  |',
					'',
					'</details>',
					'',
				].join('\n')
			)
		})
	})

	describe('token-sync', () => {
		const tokens = () => JSON.parse(readFileSync(fixture('design/tokens.json'), 'utf8'))
		const AsyncFunction = (async () => {}).constructor as new (...args: string[]) => unknown

		it('should print the token sync script for the token file and migrations (exit 0)', () => {
			const { run, stdout } = cli()

			const exitCode = run(
				'token-sync',
				'--tokens',
				fixture('design/tokens.json'),
				'--migrations',
				fixture('design/token-migrations.json')
			)

			expect(exitCode).toBe(0)
			expect(stdout).toEqual([
				buildTokenSyncScript({
					tokens: tokens(),
					migrations: [{ version: '2.0.0', from: 'brand', to: 'primary' }],
				}),
			])
			expect(
				() => new AsyncFunction('penpot', 'penpotUtils', 'storage', stdout[0])
			).not.toThrow()
		})

		it('should print the script with no migrations when --migrations is left out (exit 0)', () => {
			const { run, stdout } = cli()

			const exitCode = run('token-sync', '--tokens', fixture('design/tokens.json'))

			expect(exitCode).toBe(0)
			expect(stdout).toEqual([buildTokenSyncScript({ tokens: tokens() })])
		})

		it('should fail loudly on a token Penpot cannot hold (exit 2)', () => {
			const { files, run, stderr, stdout } = cli()
			const negative = tokens()
			negative.primitive.shadow = {
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
			files.set('negative.json', JSON.stringify(negative))

			const exitCode = run('token-sync', '--tokens', 'negative.json')

			expect(exitCode).toBe(2)
			expect(stdout).toEqual([])
			expect(stderr.join('\n')).toContain('a negative shadow spread, which Penpot rejects')
		})
	})

	describe('invalid input', () => {
		it('should fail loudly on a snapshot that does not match its schema (exit 2)', () => {
			const { files, run, stderr } = cliWithManifest()
			files.set('bad.snapshot.json', JSON.stringify({ schemaVersion: 1, components: {} }))

			const exitCode = run(
				'check',
				'--manifest',
				MANIFEST,
				'--snapshot',
				'bad.snapshot.json',
				'--tokens',
				fixture('design/tokens.json'),
				'--config',
				fixture('design/drift.config.json')
			)

			expect(exitCode).toBe(2)
			expect(stderr.join('\n')).toContain(
				'bad.snapshot.json does not match the library snapshot schema'
			)
		})

		it('should fail loudly on a token file that does not match its schema (exit 2)', () => {
			const { files, run, stderr } = cliWithManifest()
			files.set('tokens.json', JSON.stringify({ primitive: {}, light: {}, $themes: [] }))

			const exitCode = run(
				'check',
				'--manifest',
				MANIFEST,
				'--snapshot',
				fixture('design/library.snapshot.json'),
				'--tokens',
				'tokens.json',
				'--config',
				fixture('design/drift.config.json')
			)

			expect(exitCode).toBe(2)
			expect(stderr.join('\n')).toContain('tokens.json does not match the token file schema')
		})

		it('should name a missing --tokens (exit 2)', () => {
			const { run, stderr } = cliWithManifest()

			const exitCode = run(
				'check',
				'--manifest',
				MANIFEST,
				'--snapshot',
				fixture('design/library.snapshot.json'),
				'--config',
				fixture('design/drift.config.json')
			)

			expect(exitCode).toBe(2)
			expect(stderr.join('\n')).toContain('Missing --tokens')
		})

		it('should fail loudly on token migrations that do not match their schema (exit 2)', () => {
			const { files, run, stderr } = cli()
			files.set('bad-migrations.json', JSON.stringify([{ from: 'brand' }]))

			const exitCode = run(
				'token-sync',
				'--tokens',
				fixture('design/tokens.json'),
				'--migrations',
				'bad-migrations.json'
			)

			expect(exitCode).toBe(2)
			expect(stderr.join('\n')).toContain(
				'bad-migrations.json does not match the token migrations schema:'
			)
		})

		it('should print usage for an unknown command (exit 2)', () => {
			const { run, stderr } = cli()

			const exitCode = run('sync')

			expect(exitCode).toBe(2)
			expect(stderr.join('\n')).toContain('Usage: design-drift')
		})
	})
})
