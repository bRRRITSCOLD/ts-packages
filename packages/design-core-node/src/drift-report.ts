// Renders a drift report for GitHub Actions: the step summary and the job annotations.
import { DRIFT_RULE_NAMES, type DriftReport } from '@brrritscold/design-core-js/drift-check'

const markdownCell = (text: string) => text.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ')

const markdownTable = (header: string[], rows: string[][]) => [
	`| ${header.join(' | ')} |`,
	`| ${header.map(() => '---').join(' | ')} |`,
	...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
]

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * Renders the drift report as a GitHub step summary: a table of errors (component → rule →
 * expected vs found), the unchecked components, and the coverage gaps and pending gaps in
 * collapsed sections.
 */
export const formatStepSummary = ({
	errors,
	unchecked,
	coverageGaps,
	pending,
}: DriftReport): string => {
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
	if (pending.length)
		lines.push(
			'<details>',
			`<summary>Pending (${pending.length}): in the design system library, not built in the code yet</summary>`,
			'',
			...markdownTable(
				['Component', 'Rule', 'Expected', 'Found', 'Entry'],
				pending.map(({ component, rule, expected, found, entry }) => [
					component,
					`${rule} ${DRIFT_RULE_NAMES[rule]}`,
					expected,
					found,
					`\`${entry}\``,
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

/** One warning for all pending gaps, naming each component once per entry covering it. */
const formatPendingAnnotation = (pending: DriftReport['pending']): string[] => {
	if (!pending.length) return []
	const items = [...new Set(pending.map(({ component, entry }) => `${component} (${entry})`))]
	return [
		annotation(
			'warning',
			'Drift check: pending',
			`${plural(items.length, 'library item', 'library items')} the code has not built yet, listed as pending: ${items.join(', ')}`
		),
	]
}

/**
 * Renders the drift report as GitHub Actions job annotations: an error per mismatch, a warning
 * per unchecked component, one warning for all coverage gaps and one for all pending gaps.
 */
export const formatAnnotations = ({
	errors,
	unchecked,
	coverageGaps,
	pending,
}: DriftReport): string[] => [
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
	...formatPendingAnnotation(pending),
]

/**
 * Renders the tokens removed from tokens.json without a token migration as GitHub Actions job
 * annotations, an error each, or the all-clear line when there are none.
 */
export const formatUnmigratedTokens = (names: string[]): string[] =>
	names.length
		? names.map((name) =>
				annotation(
					'error',
					`Token removed without a migration: ${name}`,
					`tokens.json no longer has \`${name}\`. Add a design/token-migrations.json entry { "version", "from": "${name}", "to" } (to: null when nothing replaces it).`
				)
			)
		: ['No token removed without a token migration.']
