import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

// node_modules
import type { z } from '@brrritscold/core-js/zod'
import { codeManifestSchema } from '@brrritscold/design-core-js/code-manifest'
import {
	checkDrift,
	driftConfigSchema,
	formatSchemaIssues,
} from '@brrritscold/design-core-js/drift-check'
import { librarySnapshotSchema } from '@brrritscold/design-core-js/library-snapshot'
import { tokenFileSchema } from '@brrritscold/design-core-js/token-file'

import { generateCodeManifest } from './code-manifest.js'
import { formatAnnotations, formatStepSummary } from './drift-report.js'

export { formatAnnotations, formatStepSummary }

/** What the drift-check CLI reads and writes: the process and the file system by default. */
export type DriftCliIo = {
	/** Writes one line to standard output, where GitHub Actions reads annotations. */
	stdout: (line: string) => void
	/** Writes one line to standard error. */
	stderr: (line: string) => void
	/** The environment; `GITHUB_STEP_SUMMARY` names the file the step summary is appended to. */
	env: Record<string, string | undefined>
	/** Reads a UTF-8 text file. */
	readFile: (path: string) => string
	/** Writes a UTF-8 text file, replacing it. */
	writeFile: (path: string, text: string) => void
	/** Appends to a UTF-8 text file, creating it. */
	appendFile: (path: string, text: string) => void
}

const processIo: DriftCliIo = {
	stdout: (line) => process.stdout.write(`${line}\n`),
	stderr: (line) => process.stderr.write(`${line}\n`),
	env: process.env,
	readFile: (path) => readFileSync(path, 'utf8'),
	writeFile: (path, text) => writeFileSync(path, text),
	appendFile: (path, text) => appendFileSync(path, text),
}

const USAGE = `Usage: design-drift <command> [options]

  manifest --entry <index.d.ts> --icons <icons.d.ts> --out <code-manifest.json>
      Generate the code manifest from core-react's built declarations.

  check --manifest <code-manifest.json> --snapshot <library.snapshot.json> --tokens <tokens.json>
        --config <drift.config.json>
      Check the library snapshot against the code manifest and the token file (rules 1-9).
      Writes job annotations to stdout
      and the step summary to $GITHUB_STEP_SUMMARY (stdout when unset).
      Exit 1 on drift; coverage gaps and unchecked components only warn.

Exit 2 on a usage error or an input file that doesn't match its schema.`

/** Input the CLI can't use: a usage error or a file that doesn't match its schema (exit 2). */
class DriftCliInputError extends Error {}

/** Reads a JSON file and parses it with a schema, failing as input the CLI can't use. */
const readJson = <T>(io: DriftCliIo, path: string, what: string, schema: z.ZodType<T>): T => {
	let value: unknown
	try {
		value = JSON.parse(io.readFile(path))
	} catch (error) {
		throw new DriftCliInputError(`Cannot read ${what} ${path}: ${(error as Error).message}`)
	}
	const parsed = schema.safeParse(value)
	if (parsed.success) return parsed.data
	const issues = formatSchemaIssues(parsed.error).map((issue) => `  ${issue}`)
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

const runManifest = (argv: string[], io: DriftCliIo) => {
	const { entry, icons, out } = options(argv, ['entry', 'icons', 'out'])
	io.writeFile(out, `${JSON.stringify(generateCodeManifest({ entry, icons }), null, '\t')}\n`)
	return 0
}

const runCheck = (argv: string[], io: DriftCliIo) => {
	const paths = options(argv, ['manifest', 'snapshot', 'tokens', 'config'])
	const report = checkDrift({
		manifest: readJson(io, paths.manifest, 'code manifest', codeManifestSchema),
		snapshot: readJson(io, paths.snapshot, 'library snapshot', librarySnapshotSchema),
		tokens: readJson(io, paths.tokens, 'token file', tokenFileSchema),
		config: readJson(io, paths.config, 'drift config', driftConfigSchema),
	})
	for (const line of formatAnnotations(report)) io.stdout(line)
	const summary = formatStepSummary(report)
	if (io.env.GITHUB_STEP_SUMMARY) io.appendFile(io.env.GITHUB_STEP_SUMMARY, summary)
	else io.stdout(summary)
	return report.errors.length ? 1 : 0
}

/**
 * Runs the `design-drift` CLI and returns its exit code: `manifest` writes the code manifest,
 * `check` runs the drift check (1 on drift); 2 on a usage error or an invalid input file.
 */
export const runDriftCli = (argv: string[], io: DriftCliIo = processIo): number => {
	const [command, ...rest] = argv
	try {
		if (command === 'manifest') return runManifest(rest, io)
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
