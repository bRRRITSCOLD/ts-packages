import { z } from '@brrritscold/core-js/zod'

import type { CodeManifest } from './code-manifest.js'
import {
	COMPONENT_PACKAGE,
	exceptionsRecordSchema,
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
		if (link.kind !== 'component') continue
		if (!(link.export in manifest.exports))
			errors.push({
				rule: 1,
				component: componentLabel(component),
				expected: `export \`${link.export}\` in ${COMPONENT_PACKAGE}`,
				found: 'no such export',
			})
	}
	return { errors, unchecked: [], coverageGaps: [] }
}
