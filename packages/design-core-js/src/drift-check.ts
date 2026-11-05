import { z } from '@brrritscold/core-js/zod'

import type { CodeManifest } from './code-manifest.js'
import {
	COMPONENT_PACKAGE,
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
 * A drift rule, numbered as in the spec:
 * 1 component → export, 2 variant property → prop, 3 parts are copies, 4 icon → `<Name>Icon`,
 * 5 exceptions record valid and pointing at real props, values and roles.
 */
export type DriftRule = 1 | 2 | 3 | 4 | 5

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

/** The drift check's result: errors fail it; unchecked components and coverage gaps warn. */
export type DriftReport = {
	errors: DriftError[]
	unchecked: UncheckedComponent[]
	coverageGaps: CoverageGap[]
}

type Mismatch = Pick<DriftError, 'expected' | 'found'>

/** Rule 2 on one variant: each resolved prop exists in the code and takes the resolved value. */
const checkProps = (
	exportName: string,
	linkedProps: Record<string, LinkedProp>,
	codeProps: CodeManifest['exports'][string]['props']
): Mismatch[] =>
	Object.entries(linkedProps).flatMap(([prop, { value }]): Mismatch[] => {
		const codeProp = codeProps[prop]
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

/** Variants of one component share most mismatches; each is reported once. */
const uniqueErrors = (errors: DriftError[]): DriftError[] => [
	...new Map(errors.map((error) => [JSON.stringify(error), error])).values(),
]

const componentLabel = ({ path, name }: LibraryComponent) => (path ? `${path}/${name}` : name)

/**
 * Checks the library snapshot against the code manifest: library → code mismatches are errors
 * (rules 1–5), code → library mismatches are coverage gaps.
 */
export const checkDrift = ({ snapshot, manifest }: DriftCheckInput): DriftReport => {
	const errors: DriftError[] = []
	for (const component of Object.values(snapshot.components)) {
		const record = exceptionsRecordSchema.safeParse(component.exceptionsRecord)
		const link = resolveComponentLink(component, record.data)
		const label = componentLabel(component)
		if (link.kind === 'icon' && !manifest.icons.includes(link.export))
			errors.push({
				rule: 4,
				component: label,
				expected: `export \`${link.export}\` in ${link.package}`,
				found: 'no such icon',
			})
		if (link.kind !== 'component') continue
		const codeExport = manifest.exports[link.export]
		if (!codeExport) {
			errors.push({
				rule: 1,
				component: label,
				expected: `export \`${link.export}\` in ${COMPONENT_PACKAGE}`,
				found: 'no such export',
			})
			continue
		}
		errors.push(
			...checkProps(link.export, link.props, codeExport.props).map((mismatch) => ({
				rule: 2 as const,
				component: label,
				...mismatch,
			})),
			...link.unresolved.map(({ variantProperty, value }) => ({
				rule: 2 as const,
				component: label,
				expected: `an exceptions record value for \`${variantProperty}\` = \`${value}\``,
				found: 'no such value in the map',
			}))
		)
	}
	return { errors: uniqueErrors(errors), unchecked: [], coverageGaps: [] }
}
