import { z } from '@brrritscold/core-js/zod'

import { type CodeManifest, compareCodeUnits } from './code-manifest.js'
import {
	COMPONENT_PACKAGE,
	type ExceptionsRecord,
	exceptionsRecordSchema,
	type LinkedProp,
	resolveComponentLink,
} from './component-link.js'
import type { LibraryComponent, LibrarySnapshot } from './library-snapshot.js'

/**
 * The drift-check config, `design/drift.config.json` beside the library snapshot.
 *
 * `allowlist` names the exports that should never be in the design system library (`cn`,
 * `useDataTable`, `Toaster`), so they are not reported as coverage gaps.
 */
export const driftConfigSchema = z.strictObject({
	allowlist: z.array(z.string()),
})

/** The drift-check config; see {@link driftConfigSchema}. */
export type DriftConfig = z.infer<typeof driftConfigSchema>

/** What the drift check compares: the library snapshot, the code manifest, and the config. */
export type DriftCheckInput = {
	snapshot: LibrarySnapshot
	manifest: CodeManifest
	config: DriftConfig
}

/**
 * The drift rules, numbered as in the spec: `export` (1) component → export, `variant` (2)
 * variant property → prop, `part` (3) parts are copies, `icon` (4) icon → `<Name>Icon`,
 * `exceptionsRecord` (5) the exceptions record is valid and points at real props, values and roles.
 */
export const DRIFT_RULE = {
	export: 1,
	variant: 2,
	part: 3,
	icon: 4,
	exceptionsRecord: 5,
} as const

/** A drift rule's number; see {@link DRIFT_RULE}. */
export type DriftRule = (typeof DRIFT_RULE)[keyof typeof DRIFT_RULE]

/** A short name per drift rule, for reports: `1` is `export`. */
export const DRIFT_RULE_NAMES: Record<DriftRule, string> = {
	[DRIFT_RULE.export]: 'export',
	[DRIFT_RULE.variant]: 'variant',
	[DRIFT_RULE.part]: 'part',
	[DRIFT_RULE.icon]: 'icon',
	[DRIFT_RULE.exceptionsRecord]: 'exceptions record',
}

/** A library → code mismatch: the drift check fails on any. */
export type DriftError = {
	rule: DriftRule
	/** The library component's Penpot path and name, `Components/Button`. */
	component: string
	expected: string
	found: string
}

/** A library component the drift check can't check, because its export is in another package. */
export type UncheckedComponent = { component: string; package: string }

/**
 * Something core-react exposes with no counterpart in the design system library: an export,
 * or a value of a prop the library sets. Reported, never drift.
 */
export type CoverageGap = { export: string; prop?: string; value?: string }

/**
 * The drift check's result: errors (sorted by component, then rule) fail it; unchecked
 * components and coverage gaps warn.
 */
export type DriftReport = {
	errors: DriftError[]
	unchecked: UncheckedComponent[]
	coverageGaps: CoverageGap[]
}

type Mismatch = Pick<DriftError, 'expected' | 'found'>
/** The values each variant property, or each prop, takes: `{ size: Set { 'sm', 'default' } }`. */
type ValuesByProperty = Record<string, Set<string>>
type CodeProps = CodeManifest['exports'][string]['props']

/** Rule 2 on one variant: each resolved prop exists in the code and takes the resolved value. */
const checkProps = (
	exportName: string,
	linkedProps: Record<string, LinkedProp>,
	codeProps: CodeProps
): Mismatch[] =>
	Object.entries(linkedProps).flatMap(([prop, { value, source }]): Mismatch[] => {
		const codeProp = codeProps[prop]
		// A prop the exceptions record names but the code lacks is rule 5's to report.
		if (!codeProp && source === 'exceptions-record') return []
		if (!codeProp)
			return [
				{
					expected: `prop \`${prop}\` (boolean or literal union) on \`${exportName}\``,
					found: 'no such prop',
				},
			]
		if (value === undefined)
			return codeProp.optional
				? []
				: [
						{
							expected: `\`${prop}\` optional (the variant value \`default\` omits it)`,
							found: 'required',
						},
					]
		if (codeProp.type === 'boolean')
			return typeof value === 'boolean'
				? []
				: [{ expected: `\`${prop}\` true | false`, found: JSON.stringify(value) }]
		return codeProp.values.includes(String(value))
			? []
			: [
					{
						expected: `\`${prop}\` one of ${codeProp.values.map((v) => JSON.stringify(v)).join(' | ')}`,
						found: JSON.stringify(value),
					},
				]
	})

/** Rule 3: every part is a copy of a component in the library snapshot. */
const checkParts = (component: LibraryComponent, snapshot: LibrarySnapshot): Mismatch[] =>
	Object.entries(component.parts).flatMap(([role, { componentId }]): Mismatch[] => {
		const expected = `part \`${role}\` a copy of a library component`
		if (componentId === null) return [{ expected, found: 'a plain layer' }]
		if (!(componentId in snapshot.components))
			return [{ expected, found: `a copy of \`${componentId}\`, not in the library` }]
		return []
	})

/**
 * Rule 5 beyond the schema: every key of the record points at something real. `codeProps` is
 * `undefined` when the export can't be checked (another package, or rule 1 failed), which
 * leaves the `props` keys unchecked.
 */
const checkRecordKeys = (
	component: LibraryComponent,
	record: ExceptionsRecord,
	variantValues: ValuesByProperty,
	exportName: string,
	codeProps: CodeProps | undefined
): Mismatch[] => {
	const label = componentLabel(component)
	const mismatches: Mismatch[] = []
	for (const [prop, { from, map }] of Object.entries(record.props ?? {})) {
		if (codeProps && !(prop in codeProps))
			mismatches.push({
				expected: `\`props\` keys → props of \`${exportName}\``,
				found: `\`${prop}\`: no such prop`,
			})
		const values = variantValues[from]
		if (!values) {
			mismatches.push({
				expected: `\`props.${prop}.from\` → a variant property of \`${label}\``,
				found: `\`${from}\`: no such variant property`,
			})
			continue
		}
		for (const value of Object.keys(map))
			if (!values.has(value))
				mismatches.push({
					expected: `\`props.${prop}.map\` keys → values of \`${from}\``,
					found: `\`${value}\`: no such value`,
				})
	}
	for (const role of record.slots ?? [])
		if (!(role in component.parts))
			mismatches.push({
				expected: '`slots` → roles of the parts',
				found: `\`${role}\`: no such role`,
			})
	return mismatches
}

/** The values each variant property takes across every variant of each component, by label. */
const collectVariantValues = (snapshot: LibrarySnapshot): Map<string, ValuesByProperty> => {
	const byComponent = new Map<string, ValuesByProperty>()
	for (const component of Object.values(snapshot.components)) {
		const label = componentLabel(component)
		const values = byComponent.get(label) ?? {}
		for (const [property, value] of Object.entries(component.variantProperties))
			(values[property] ??= new Set()).add(value)
		byComponent.set(label, values)
	}
	return byComponent
}

/**
 * The coverage report: each export no library component links to (unless allowlisted), and
 * each literal of a prop the library sets that no variant uses (`default` omits the prop).
 */
const reportCoverage = (
	manifest: CodeManifest,
	allowlist: string[],
	linked: Map<string, ValuesByProperty>
): CoverageGap[] =>
	Object.entries(manifest.exports).flatMap(([exportName, { props }]): CoverageGap[] => {
		const usedValues = linked.get(exportName)
		if (!usedValues) return allowlist.includes(exportName) ? [] : [{ export: exportName }]
		return Object.entries(usedValues).flatMap(([prop, used]) => {
			const codeProp = props[prop]
			if (codeProp?.type !== 'literals') return []
			return codeProp.values
				.filter((value) => !used.has(value))
				.map((value) => ({ export: exportName, prop, value }))
		})
	})

/** Errors by component, then rule, so a report reads component by component. */
const byComponentThenRule = (a: DriftError, b: DriftError) =>
	compareCodeUnits(a.component, b.component) || a.rule - b.rule

/** Variants of one component share most mismatches; each is reported once. */
const uniqueBy = <T>(items: T[]): T[] => [
	...new Map(items.map((item) => [JSON.stringify(item), item])).values(),
]

const componentLabel = ({ path, name }: LibraryComponent) => (path ? `${path}/${name}` : name)

/**
 * One line per issue of a failed parse, `components.abc.name: Invalid input`, or the bare
 * message for an issue at the root: how the drift check and its CLI report invalid input.
 */
export const formatSchemaIssues = (error: z.ZodError): string[] =>
	error.issues.map(({ path, message }) =>
		path.length ? `${path.map(String).join('.')}: ${message}` : message
	)

/**
 * Checks the library snapshot against the code manifest: library → code mismatches are errors
 * (rules 1–5), code → library mismatches are coverage gaps.
 */
export const checkDrift = ({ snapshot, manifest, config }: DriftCheckInput): DriftReport => {
	const errors: DriftError[] = []
	const unchecked: UncheckedComponent[] = []
	/** Per core-react export a library component links to: the values it gives each prop. */
	const linked = new Map<string, ValuesByProperty>()
	const variantValues = collectVariantValues(snapshot)

	for (const component of Object.values(snapshot.components)) {
		const label = componentLabel(component)
		const report = (rule: DriftRule) => (mismatch: Mismatch) =>
			errors.push({ rule, component: label, ...mismatch })

		const parsed =
			component.exceptionsRecord === undefined
				? undefined
				: exceptionsRecordSchema.safeParse(component.exceptionsRecord)
		if (parsed && !parsed.success)
			report(DRIFT_RULE.exceptionsRecord)({
				expected: 'an exceptions record matching its schema',
				found: formatSchemaIssues(parsed.error).join('; '),
			})
		const record = parsed?.data
		const link = resolveComponentLink(component, record)
		checkParts(component, snapshot).forEach(report(DRIFT_RULE.part))

		if (link.kind === 'icon' && !manifest.icons.includes(link.export))
			report(DRIFT_RULE.icon)({
				expected: `export \`${link.export}\` in ${link.package}`,
				found: 'no such icon',
			})
		if (link.kind !== 'component') continue

		// Another package's exports aren't in the code manifest, so they can't be checked.
		const checked = link.package === COMPONENT_PACKAGE
		const codeExport = checked ? manifest.exports[link.export] : undefined
		if (!checked) unchecked.push({ component: label, package: link.package })
		else {
			const usedValues = linked.get(link.export) ?? {}
			for (const [prop, { value }] of Object.entries(link.props))
				(usedValues[prop] ??= new Set()).add(
					value === undefined ? 'default' : String(value)
				)
			linked.set(link.export, usedValues)
			if (!codeExport)
				report(DRIFT_RULE.export)({
					expected: `export \`${link.export}\` in ${COMPONENT_PACKAGE}`,
					found: 'no such export',
				})
		}
		if (record)
			checkRecordKeys(
				component,
				record,
				variantValues.get(label) ?? {},
				link.export,
				codeExport?.props
			).forEach(report(DRIFT_RULE.exceptionsRecord))
		// An invalid record would make every mapped property look like a missing prop.
		if (!codeExport || (parsed && !parsed.success)) continue
		checkProps(link.export, link.props, codeExport.props).forEach(report(DRIFT_RULE.variant))
		for (const { variantProperty, value } of link.unresolved)
			report(DRIFT_RULE.variant)({
				expected: `an exceptions record value for \`${variantProperty}\` = \`${value}\``,
				found: 'no such value in the map',
			})
	}
	return {
		errors: uniqueBy(errors).sort(byComponentThenRule),
		unchecked: uniqueBy(unchecked),
		coverageGaps: reportCoverage(manifest, config.allowlist, linked),
	}
}
