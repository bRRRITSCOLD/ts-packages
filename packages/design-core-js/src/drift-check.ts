import { z } from '@brrritscold/core-js/zod'

import { type CodeManifest, compareCodeUnits } from './code-manifest.js'
import {
	COMPONENT_PACKAGE,
	type ExceptionsRecord,
	exceptionsRecordSchema,
	findNearMiss,
	type LinkedProp,
	resolveComponentLink,
} from './component-link.js'
import type { LibraryComponent, LibraryLayer, LibrarySnapshot } from './library-snapshot.js'
import {
	type DesignToken,
	flattenTokens,
	sameToken,
	TOKEN_THEMES,
	type TokenFile,
	type TokenTheme,
} from './token-file.js'

/**
 * The drift-check config, `design/drift.config.json` beside the library snapshot.
 *
 * `allowlist` names the exports that should never be in the design system library (`cn`,
 * `useDataTable`, `Toaster`), so they are not reported as coverage gaps.
 *
 * `valueAllowlist` does the same for prop literals no variant should ever show, keyed
 * `<Export>.<prop>`: values a type inherits that render like another value
 * (`{ "Input.aria-invalid": ["grammar", "spelling"] }`).
 */
export const driftConfigSchema = z.strictObject({
	allowlist: z.array(z.string()),
	valueAllowlist: z.record(z.string(), z.array(z.string())).optional(),
})

/** The drift-check config; see {@link driftConfigSchema}. */
export type DriftConfig = z.infer<typeof driftConfigSchema>

/**
 * What the drift check compares: the library snapshot, the code manifest, the token file
 * (`tokens.json`) and the config.
 */
export type DriftCheckInput = {
	snapshot: LibrarySnapshot
	manifest: CodeManifest
	tokens: TokenFile
	config: DriftConfig
}

/**
 * The drift rules, numbered as in the spec: `export` (1) component → export, `variant` (2)
 * variant property → prop, `part` (3) parts are copies and no layout wrapper is named like a part export, `icon` (4) icon → `<Name>Icon`,
 * `exceptionsRecord` (5) the exceptions record is valid and points at real props, values and
 * roles, `tokenCatalog` (6) the token catalog equals the token file, `unbound` (7) no checked
 * attribute holds a raw value, `unknownToken` (8) every applied token is in the token file,
 * `primitiveColour` (9) no fill or stroke colour comes from a `primitive` token. Rules 7–9 skip
 * `_internal/` components, as rules 1–5 do.
 */
export const DRIFT_RULE = {
	export: 1,
	variant: 2,
	part: 3,
	icon: 4,
	exceptionsRecord: 5,
	tokenCatalog: 6,
	unbound: 7,
	unknownToken: 8,
	primitiveColour: 9,
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
	[DRIFT_RULE.tokenCatalog]: 'token catalog',
	[DRIFT_RULE.unbound]: 'unbound',
	[DRIFT_RULE.unknownToken]: 'unknown token',
	[DRIFT_RULE.primitiveColour]: 'primitive colour',
}

/** The `component` of a rule-6 error: the token catalog belongs to no one component. */
export const TOKEN_CATALOG_LABEL = 'Token catalog'

/** A library → code mismatch: the drift check fails on any. */
export type DriftError = {
	rule: DriftRule
	/**
	 * The library component's Penpot path and name, `Components/Button`, or
	 * {@link TOKEN_CATALOG_LABEL} for rule 6.
	 */
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

/** Appends a near-miss suggestion to a finding, when there is one. */
const withHint = (found: string, nearMiss: string | undefined) =>
	nearMiss === undefined ? found : `${found}; did you mean \`${nearMiss}\`?`

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
					found: withHint('no such prop', findNearMiss(prop, Object.keys(codeProps))),
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
	Object.entries(component.parts).flatMap(([role, { componentId }]): Mismatch[] =>
		componentId in snapshot.components
			? []
			: [
					{
						expected: `part \`${role}\` a copy of a library component`,
						found: `a copy of \`${componentId}\`, not in the library`,
					},
				]
	)

/**
 * Rule 3 on layout wrappers: a plain board or group named like one of the component's part
 * exports (`Card` + `Header` → `CardHeader`) was meant to be a copy of that part.
 */
const checkWrappers = (
	component: LibraryComponent,
	exportName: string,
	manifest: CodeManifest
): Mismatch[] =>
	component.wrappers.flatMap((wrapper): Mismatch[] => {
		const partExport = `${exportName}${wrapper}`
		return partExport in manifest.exports
			? [
					{
						expected: `part \`${wrapper}\` a copy of \`${componentLabel(component)}/${wrapper}\` (export \`${partExport}\`)`,
						found: 'a plain board or group',
					},
				]
			: []
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

/** Rule 6's hint: the catalog is only ever fixed by writing the token file into Penpot again. */
const RESYNC = '(re-run token sync)'

/** JSON with object keys sorted at every depth, so equal values compare equal whatever their order. */
const canonicalJson = (value: unknown): string =>
	JSON.stringify(value, (_, nested) =>
		nested && typeof nested === 'object' && !Array.isArray(nested)
			? Object.fromEntries(Object.entries(nested).sort(([a], [b]) => compareCodeUnits(a, b)))
			: nested
	)

const describeToken = ({ $type, $value, $description }: DesignToken) =>
	`${$type} ${canonicalJson($value)}${$description ? ` (${JSON.stringify($description)})` : ''}`

const sorted = (values: Iterable<string>) => [...values].sort(compareCodeUnits)

const themePath = ({ group, name }: TokenTheme) => `${group}/${name}`

/** Rule 6: the catalog's sets, their tokens and the themes are exactly the token file's. */
const checkTokenCatalog = (snapshot: LibrarySnapshot, tokenFile: TokenFile): Mismatch[] => {
	const mismatches: Mismatch[] = []
	const expectedSets: Record<string, TokenFile[keyof TokenFile]> = tokenFile
	const extraSets = sorted(Object.keys(snapshot.tokens)).filter((set) => !(set in expectedSets))
	for (const set of extraSets)
		mismatches.push({
			expected: `only the sets of tokens.json (${sorted(Object.keys(expectedSets)).join(', ')}) ${RESYNC}`,
			found: `set \`${set}\``,
		})
	for (const set of sorted(Object.keys(expectedSets))) {
		const found = snapshot.tokens[set]
		if (!found) {
			mismatches.push({ expected: `set \`${set}\` ${RESYNC}`, found: 'no such set' })
			continue
		}
		const expectedTokens = flattenTokens(expectedSets[set])
		const foundTokens = flattenTokens(found)
		for (const name of sorted(
			new Set([...Object.keys(expectedTokens), ...Object.keys(foundTokens)])
		)) {
			const expectedToken = expectedTokens[name]
			const foundToken = foundTokens[name]
			if (!expectedToken)
				mismatches.push({
					expected: `no \`${set}\` token \`${name}\`, as in tokens.json ${RESYNC}`,
					found: describeToken(foundToken),
				})
			else if (!foundToken || !sameToken(expectedToken, foundToken))
				mismatches.push({
					expected: `\`${set}\` token \`${name}\` = ${describeToken(expectedToken)} ${RESYNC}`,
					found: foundToken ? describeToken(foundToken) : 'no such token',
				})
		}
	}

	const expectedThemes = new Map(TOKEN_THEMES.map((theme) => [themePath(theme), theme]))
	const foundThemes = new Map(snapshot.tokenThemes.map((theme) => [themePath(theme), theme]))
	for (const path of sorted(foundThemes.keys()))
		if (!expectedThemes.has(path))
			mismatches.push({
				expected: `only the themes ${sorted(expectedThemes.keys()).join(', ')} ${RESYNC}`,
				found: `theme \`${path}\``,
			})
	for (const [path, theme] of expectedThemes) {
		const found = foundThemes.get(path)
		const expectedSetList = sorted(theme.sets).join(', ')
		if (found && sorted(found.sets).join(', ') === expectedSetList) continue
		mismatches.push({
			expected: `theme \`${path}\` enabling ${expectedSetList} ${RESYNC}`,
			found: found
				? `enabling ${sorted(found.sets).join(', ') || 'no set'}`
				: 'no such theme',
		})
	}
	return mismatches
}

/** The token names of the token file: every token's, and the `primitive` set's alone. */
const collectTokenNames = (tokenFile: TokenFile) => ({
	all: new Set(Object.values(tokenFile).flatMap((set) => Object.keys(flattenTokens(set)))),
	primitive: new Set(Object.keys(flattenTokens(tokenFile.primitive))),
})

/** The colour attributes rule 9 keeps primitive tokens off. */
const COLOUR_ATTRIBUTES = new Set<string>(['fill', 'stroke-color'])

const layerLabel = (id: string, { namePath }: LibraryLayer) =>
	`layer \`${namePath.join(' / ')}\` (${id})`

/**
 * Whether a layer sits inside a copy of an `_internal/` component (a slot placeholder), whose
 * layers keep the placeholder's raw styling. Below the main instance a part copy's layer name
 * is its role, so each name that is a role steps into that part's component: a slot two copies
 * down (a Card Header's Action's Body) is found too. A wrapper or plain layer keeps the current
 * component.
 */
const isInsideSlot = (
	component: LibraryComponent,
	{ namePath }: LibraryLayer,
	snapshot: LibrarySnapshot
) => {
	let current = component
	for (const name of namePath.slice(1)) {
		const role = current.parts[name]
		if (!role) continue
		const part = snapshot.components[role.componentId]
		if (part === undefined) return false
		if (resolveComponentLink(part).kind === 'internal') return true
		current = part
	}
	return false
}

/**
 * Rules 7–9 on one component's layers: no raw values, no unknown tokens, no primitive colours.
 * A layer inside a slot placeholder, at any depth of part copies, is skipped.
 */
const checkLayers = (
	component: LibraryComponent,
	snapshot: LibrarySnapshot,
	tokenNames: ReturnType<typeof collectTokenNames>,
	report: (rule: DriftRule) => (mismatch: Mismatch) => void
) => {
	for (const [id, layer] of Object.entries(component.layers)) {
		if (isInsideSlot(component, layer, snapshot)) continue
		const label = layerLabel(id, layer)
		if (layer.unbound.length)
			report(DRIFT_RULE.unbound)({
				expected: `a token on ${layer.unbound.map((attr) => `\`${attr}\``).join(', ')} of ${label}`,
				found: 'a raw value',
			})
		for (const [attribute, token] of Object.entries(layer.appliedTokens)) {
			if (!tokenNames.all.has(token))
				report(DRIFT_RULE.unknownToken)({
					expected: `a token of tokens.json on \`${attribute}\` of ${label}`,
					found: `\`${token}\`: no such token`,
				})
			else if (COLOUR_ATTRIBUTES.has(attribute) && tokenNames.primitive.has(token))
				report(DRIFT_RULE.primitiveColour)({
					expected: `a semantic colour on \`${attribute}\` of ${label}`,
					found: `the primitive \`${token}\``,
				})
		}
	}
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
 * each literal of a prop the library sets that no variant uses (`default` omits the prop),
 * unless on the value allowlist.
 */
const reportCoverage = (
	manifest: CodeManifest,
	{ allowlist, valueAllowlist = {} }: DriftConfig,
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
				.filter((value) => !valueAllowlist[`${exportName}.${prop}`]?.includes(value))
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
export const formatSchemaIssues = (error: Pick<z.ZodError, 'issues'>): string[] =>
	error.issues.map(({ path, message }) =>
		path.length ? `${path.map(String).join('.')}: ${message}` : message
	)

/**
 * Checks the library snapshot against the code manifest and the token file: library → code
 * mismatches are errors (rules 1–9), code → library mismatches are coverage gaps.
 */
export const checkDrift = ({
	snapshot,
	manifest,
	tokens,
	config,
}: DriftCheckInput): DriftReport => {
	const errors: DriftError[] = []
	for (const mismatch of checkTokenCatalog(snapshot, tokens))
		errors.push({ rule: DRIFT_RULE.tokenCatalog, component: TOKEN_CATALOG_LABEL, ...mismatch })
	const tokenNames = collectTokenNames(tokens)
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
		// An `_internal/` component links to no code, so no core-react styling binds its layers:
		// the slot placeholder keeps its raw magenta fill.
		if (link.kind !== 'internal') checkLayers(component, snapshot, tokenNames, report)

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
			checkWrappers(component, link.export, manifest).forEach(report(DRIFT_RULE.part))
			const usedValues = linked.get(link.export) ?? {}
			for (const [prop, { value }] of Object.entries(link.props))
				(usedValues[prop] ??= new Set()).add(
					value === undefined ? 'default' : String(value)
				)
			linked.set(link.export, usedValues)
			if (!codeExport)
				report(DRIFT_RULE.export)({
					expected: `export \`${link.export}\` in ${COMPONENT_PACKAGE}`,
					found: withHint(
						'no such export',
						findNearMiss(link.export, Object.keys(manifest.exports))
					),
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
		coverageGaps: reportCoverage(manifest, config, linked),
	}
}
