import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// testee
import { type DriftCliIo, runDriftCli } from '../../src/drift-check.js'

const fixture = (file: string) => fileURLToPath(new URL(`./__fixtures__/${file}`, import.meta.url))

/** Runs the CLI with its output captured, and the step summary written to a file in `dir`. */
const run = async (dir: string, ...argv: string[]) => {
	const stdout: string[] = []
	const stderr: string[] = []
	const stepSummary = join(dir, `step-summary-${Math.random()}.md`)
	writeFileSync(stepSummary, '')
	const io: DriftCliIo = {
		stdout: (line) => stdout.push(line),
		stderr: (line) => stderr.push(line),
		env: { GITHUB_STEP_SUMMARY: stepSummary },
	}
	const exitCode = await runDriftCli(argv, io)
	return { exitCode, stdout, stderr, summary: readFileSync(stepSummary, 'utf8') }
}

describe('design-drift CLI', () => {
	let dir: string
	let manifest: string
	const check = (snapshot: string) =>
		run(
			dir,
			'check',
			'--manifest',
			manifest,
			'--snapshot',
			fixture(`design/${snapshot}`),
			'--config',
			fixture('design/drift.config.json')
		)

	beforeAll(async () => {
		dir = mkdtempSync(join(tmpdir(), 'design-drift-'))
		manifest = join(dir, 'code-manifest.json')
		const { exitCode } = await run(
			dir,
			'manifest',
			'--entry',
			fixture('core-react/index.d.ts'),
			'--icons',
			fixture('core-react/icons.d.ts'),
			'--out',
			manifest
		)
		expect(exitCode).toBe(0)
	})

	afterAll(() => {
		rmSync(dir, { recursive: true, force: true })
	})

	describe('manifest', () => {
		it('should write the code manifest of the .d.ts as JSON', () => {
			const written = JSON.parse(readFileSync(manifest, 'utf8'))

			expect(Object.keys(written.exports)).toContain('Button')
			expect(written.icons).toEqual(['BellIcon', 'Trash2Icon'])
		})
	})

	describe('check, library in step with the code', () => {
		it('should pass, with no annotation but the coverage-gap warning (exit 0)', async () => {
			const { exitCode, stdout } = await check('library.snapshot.json')

			expect(exitCode).toBe(0)
			expect(stdout).toEqual([
				'::warning title=Drift check%3A coverage gaps::1 export or prop value of core-react has no counterpart in the design system library: Toggle',
			])
		})

		it('should say there is no drift, with the coverage gaps collapsed', async () => {
			const { summary } = await check('library.snapshot.json')

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
		it('should fail with one error annotation per mismatch and a warning per unchecked component (exit 1)', async () => {
			const { exitCode, stdout } = await check('library.drifted.snapshot.json')

			expect(exitCode).toBe(1)
			expect(stdout).toEqual([
				'::error title=Drift rule 2 (variant)%3A Components/Badge::Expected `variant` one of "default" | "secondary"; found "ghost"',
				'::error title=Drift rule 3 (part)%3A Components/Card::Expected part `Footer` a copy of a library component; found a plain layer',
				'::error title=Drift rule 5 (exceptions record)%3A Components/Card/Content::Expected `slots` → roles of the parts; found `Footer`: no such role',
				'::error title=Drift rule 1 (export)%3A Components/Tag::Expected export `Tag` in @brrritscold/core-react; found no such export',
				'::error title=Drift rule 4 (icon)%3A icon/Envelope::Expected export `EnvelopeIcon` in @brrritscold/core-react/icons; found no such icon',
				'::warning title=Drift check%3A unchecked component::Components/DatePicker links to @brrritscold/other-react, which the drift check cannot check',
				'::warning title=Drift check%3A coverage gaps::1 export or prop value of core-react has no counterpart in the design system library: Toggle',
			])
		})

		it('should write a step summary table of component → rule → expected vs found', async () => {
			const { summary } = await check('library.drifted.snapshot.json')

			expect(summary).toBe(
				[
					'## Drift check',
					'',
					'**5 errors**: the design system library disagrees with core-react. Fix the library, then refresh the snapshot.',
					'',
					'| Component | Rule | Expected | Found |',
					'| --- | --- | --- | --- |',
					'| Components/Badge | 2 variant | `variant` one of "default" \\| "secondary" | "ghost" |',
					'| Components/Card | 3 part | part `Footer` a copy of a library component | a plain layer |',
					'| Components/Card/Content | 5 exceptions record | `slots` → roles of the parts | `Footer`: no such role |',
					'| Components/Tag | 1 export | export `Tag` in @brrritscold/core-react | no such export |',
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

	describe('invalid input', () => {
		it('should fail loudly on a snapshot that does not match its schema (exit 2)', async () => {
			const snapshot = join(dir, 'bad.snapshot.json')
			writeFileSync(snapshot, JSON.stringify({ schemaVersion: 1, components: {} }))

			const { exitCode, stderr } = await run(
				dir,
				'check',
				'--manifest',
				manifest,
				'--snapshot',
				snapshot,
				'--config',
				fixture('design/drift.config.json')
			)

			expect(exitCode).toBe(2)
			expect(stderr.join('\n')).toContain(
				`${snapshot} does not match the library snapshot schema`
			)
		})

		it('should print usage for an unknown command (exit 2)', async () => {
			const { exitCode, stderr } = await run(dir, 'sync')

			expect(exitCode).toBe(2)
			expect(stderr.join('\n')).toContain('Usage: design-drift')
		})
	})
})
