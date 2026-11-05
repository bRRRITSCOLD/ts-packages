import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

// node_modules
import type { z } from '@brrritscold/core-js/zod'
import { codeManifestSchema } from '@brrritscold/design-core-js/code-manifest'
import {
	checkDrift,
	DRIFT_RULE_NAMES,
	type DriftReport,
	driftConfigSchema,
} from '@brrritscold/design-core-js/drift-check'
import { librarySnapshotSchema } from '@brrritscold/design-core-js/library-snapshot'

import { generateCodeManifest } from './code-manifest.js'

/** What the drift-check CLI writes to and reads its environment from; the process by default. */
export type DriftCliIo = {
	/** Writes one line to standard output, where GitHub Actions reads annotations. */
	stdout: (line: string) => void
	/** Writes one line to standard error. */
	stderr: (line: string) => void
	/** The environment; `GITHUB_STEP_SUMMARY` names the file the step summary is appended to. */
	env: Record<string, string | undefined>
}

const processIo: DriftCliIo = {
	stdout: (line) => process.stdout.write(`${line}\n`),
	stderr: (line) => process.stderr.write(`${line}\n`),
	env: process.env,
}

const USAGE = `Usage: design-drift <command> [options]

  manifest --entry <index.d.ts> --icons <icons.d.ts> --out <code-manifest.json>
      Generate the code manifest from core-react's built declarations.

  check --manifest <code-manifest.json> --snapshot <library.snapshot.json> --config <drift.config.json>
      Check the library snapshot against the code manifest. Writes job annotations to stdout
      and the step summary to $GITHUB_STEP_SUMMARY (stdout when unset).
      Exit 1 on drift; coverage gaps and unchecked components only warn.

Exit 2 on a usage error or an input file that doesn't match its schema.`

/** Input the CLI can't use: a usage error or a file that doesn't match its schema (exit 2). */
class DriftCliInputError extends Error {}

const markdownCell = (text: string) => text.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ')

const markdownTable = (header: string[], rows: string[][]) => [
	`| ${header.join(' | ')} |`,
	`| ${header.map(() => '---').join(' | ')} |`,
	...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
]

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * Renders the drift report as a GitHub step summary: a table of errors (component → rule →
 * expected vs found), the unchecked components, and the coverage gaps in a collapsed section.
 */
export const formatStepSummary = ({ errors, unchecked, coverageGaps }: DriftReport): string => {
	const lines = ['## Drift check', '']
	if (errors.length)
		lines.push(
			`**${plural(errors.length, 'error', 'errors')}**: the design system library disagrees with core-react. Fix the library, then refresh the snapshot.`,
			'',
			...markdownTable(
				['Component', 'Rule', 'Expected', 'Found'],
				errors.map(({ component, rule, expected, found }) => [
					component,
					`${rule} ${DRIFT_RULE_NAMES[rule]}`,
					expected,
					found,
				])
			),
			''
		)
	else lines.push('No drift: the design system library agrees with core-react.', '')
	if (unchecked.length)
		lines.push(
			`### Unchecked (${unchecked.length})`,
			'',
			'Their exceptions record names another package, so the drift check cannot check them.',
			'',
			...markdownTable(
				['Component', 'Package'],
				unchecked.map(({ component, package: name }) => [component, name])
			),
			''
		)
	if (coverageGaps.length)
		lines.push(
			'<details>',
			`<summary>Coverage gaps (${coverageGaps.length}): in core-react, not in the design system library</summary>`,
			'',
			...markdownTable(
				['Export', 'Prop', 'Value'],
				coverageGaps.map(({ export: name, prop, value }) => [
					`\`${name}\``,
					prop ? `\`${prop}\`` : '',
					value ? `\`${value}\`` : '',
				])
			),
			'',
			'</details>',
			''
		)
	return lines.join('\n')
}

/** Escapes a workflow-command message, and with `property` also a title, for GitHub Actions. */
const escapeCommand = (text: string, property = false) => {
	const escaped = text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
	return property ? escaped.replace(/:/g, '%3A').replace(/,/g, '%2C') : escaped
}

const annotation = (level: 'error' | 'warning', title: string, message: string) =>
	`::${level} title=${escapeCommand(title, true)}::${escapeCommand(message)}`

/**
 * Renders the drift report as GitHub Actions job annotations: an error per mismatch, a warning
 * per unchecked component, and one warning for all coverage gaps.
 */
export const formatAnnotations = ({ errors, unchecked, coverageGaps }: DriftReport): string[] => [
	...errors.map(({ rule, component, expected, found }) =>
		annotation(
			'error',
			`Drift rule ${rule} (${DRIFT_RULE_NAMES[rule]}): ${component}`,
			`Expected ${expected}; found ${found}`
		)
	),
	...unchecked.map(({ component, package: name }) =>
		annotation(
			'warning',
			'Drift check: unchecked component',
			`${component} links to ${name}, which the drift check cannot check`
		)
	),
	...(coverageGaps.length
		? [
				annotation(
					'warning',
					'Drift check: coverage gaps',
					`${plural(coverageGaps.length, 'export or prop value', 'exports or prop values')} of core-react ${coverageGaps.length === 1 ? 'has' : 'have'} no counterpart in the design system library: ${coverageGaps
						.map(({ export: name, prop, value }) =>
							prop ? `${name} ${prop}=${value}` : name
						)
						.join(', ')}`
				),
			]
		: []),
]

/** Reads a JSON file and parses it with a schema, failing as input the CLI can't use. */
const readJson = <T>(path: string, what: string, schema: z.ZodType<T>): T => {
	let value: unknown
	try {
		value = JSON.parse(readFileSync(path, 'utf8'))
	} catch (error) {
		throw new DriftCliInputError(`Cannot read ${what} ${path}: ${(error as Error).message}`)
	}
	const parsed = schema.safeParse(value)
	if (parsed.success) return parsed.data
	const issues = parsed.error.issues.map(
		({ path: at, message }) => `  ${at.map(String).join('.') || '(root)'}: ${message}`
	)
	throw new DriftCliInputError(
		[`${path} does not match the ${what} schema:`, ...issues].join('\n')
	)
}

const options = (argv: string[], names: string[]) => {
	const { values } = parseArgs({
		args: argv,
		options: Object.fromEntries(names.map((name) => [name, { type: 'string' as const }])),
		strict: true,
	})
	const missing = names.filter((name) => !values[name])
	if (missing.length)
		throw new DriftCliInputError(`Missing ${missing.map((name) => `--${name}`).join(', ')}`)
	return values as Record<string, string>
}

const runManifest = (argv: string[]) => {
	const { entry, icons, out } = options(argv, ['entry', 'icons', 'out'])
	writeFileSync(out, `${JSON.stringify(generateCodeManifest({ entry, icons }), null, '\t')}\n`)
	return 0
}

const runCheck = (argv: string[], io: DriftCliIo) => {
	const paths = options(argv, ['manifest', 'snapshot', 'config'])
	const report = checkDrift({
		manifest: readJson(paths.manifest, 'code manifest', codeManifestSchema),
		snapshot: readJson(paths.snapshot, 'library snapshot', librarySnapshotSchema),
		config: readJson(paths.config, 'drift config', driftConfigSchema),
	})
	for (const line of formatAnnotations(report)) io.stdout(line)
	const summary = formatStepSummary(report)
	if (io.env.GITHUB_STEP_SUMMARY) appendFileSync(io.env.GITHUB_STEP_SUMMARY, summary)
	else io.stdout(summary)
	return report.errors.length ? 1 : 0
}

/**
 * Runs the `design-drift` CLI and resolves to its exit code: `manifest` writes the code manifest,
 * `check` runs the drift check (1 on drift); 2 on a usage error or an invalid input file.
 */
export const runDriftCli = async (argv: string[], io: DriftCliIo = processIo): Promise<number> => {
	const [command, ...rest] = argv
	try {
		if (command === 'manifest') return runManifest(rest)
		if (command === 'check') return runCheck(rest, io)
		throw new DriftCliInputError(command ? `Unknown command: ${command}` : 'No command')
	} catch (error) {
		const isUsageError =
			error instanceof DriftCliInputError ||
			String((error as { code?: unknown }).code).startsWith('ERR_PARSE_ARGS')
		if (!isUsageError) throw error
		io.stderr((error as Error).message)
		io.stderr('')
		io.stderr(USAGE)
		return 2
	}
}
