import { z } from '@brrritscold/core-js/zod'

import type { LibraryComponent } from './library-snapshot.js'

/** The `sharedPluginData` namespace a library component's exceptions record is stored under. */
export const EXCEPTIONS_RECORD_NAMESPACE = 'brrritscold.core-react'

/** The `sharedPluginData` key a library component's exceptions record is stored under. */
export const EXCEPTIONS_RECORD_KEY = 'link'

/** The package a library component's export is in unless its exceptions record names another. */
export const COMPONENT_PACKAGE = '@brrritscold/core-react'

/** The package the `<Name>Icon` export of an icon component is in. */
export const ICON_PACKAGE = '@brrritscold/core-react/icons'

/**
 * The exceptions record: the part of a component link stored on a library component that holds
 * only what its names cannot say.
 *
 * - `v`: the record's format version.
 * - `props`: a value map per prop whose values don't match the variant values, keyed by prop:
 *   `{ disabled: { from: 'state', map: { Disabled: true, Default: false } } }` sets `disabled`
 *   from the variant property `state`.
 * - `slots`: the roles of the parts that are slot placeholders, for a designer to swap.
 * - `package`: the package the export is in, when it isn't core-react.
 */
export const exceptionsRecordSchema = z.strictObject({
	v: z.literal(1),
	props: z
		.record(
			z.string(),
			z.strictObject({
				from: z.string(),
				map: z.record(z.string(), z.union([z.string(), z.boolean()])),
			})
		)
		.optional(),
	slots: z.array(z.string()).optional(),
	package: z.string().optional(),
})

/** The exceptions record; see {@link exceptionsRecordSchema}. */
export type ExceptionsRecord = z.infer<typeof exceptionsRecordSchema>

/**
 * One prop of a resolved component link.
 *
 * `value` is `undefined` when the prop is omitted (the variant value `default`); `source` says
 * whether the naming convention or the exceptions record gave it.
 */
export type LinkedProp = {
	value: string | boolean | undefined
	source: 'convention' | 'exceptions-record'
}

/** A variant value the exceptions record maps the property of, but not the value itself. */
export type UnresolvedVariantValue = { variantProperty: string; value: string }

/**
 * What a library component links to under the naming convention and its exceptions record.
 *
 * - `component`: a named export with props resolved from the variant properties.
 * - `icon`: a `<Name>Icon` export of the icons package.
 * - `internal`: an `_internal/` component (a slot placeholder), which links to no code.
 */
export type ComponentLink =
	| {
			kind: 'component'
			package: string
			export: string
			props: Record<string, LinkedProp>
			unresolved: UnresolvedVariantValue[]
	  }
	| { kind: 'icon'; package: string; export: string }
	| { kind: 'internal' }

/** The path group that holds the icon components. */
const ICON_GROUP = 'icon'
/** The path group that holds components with no code counterpart, such as the slot placeholder. */
const INTERNAL_GROUP = '_internal'
/** The path group that holds the components; it organizes the library and never names an export. */
const COMPONENTS_GROUP = 'Components'

/** `default` omits the prop; `true` / `false` are booleans; anything else is the literal itself. */
const conventionValue = (value: string): LinkedProp['value'] => {
	if (value === 'default') return undefined
	if (value === 'true') return true
	if (value === 'false') return false
	return value
}

/**
 * Resolves a library component to the code it links to: the shared resolver behind the drift
 * check, the link inspector and the link reader.
 *
 * Naming convention: the export is the component's path, without its `Components` group,
 * joined to its name (`Components/Button` → `Button`, `Components/Card/Header` → `CardHeader`);
 * a component under `icon/` named `<Name>` is `<Name>Icon`; a component under `_internal/` links
 * to nothing. Each variant property is a prop and its value the prop's value (`default` omits
 * it; `true` / `false` are booleans), unless the exceptions record maps the property.
 *
 * The exceptions record is taken already validated; drift rule 5 validates it.
 */
export const resolveComponentLink = (
	component: Pick<LibraryComponent, 'path' | 'name' | 'variantProperties'>,
	exceptionsRecord?: ExceptionsRecord
): ComponentLink => {
	const groups = component.path
		.split('/')
		.map((segment) => segment.trim())
		.filter(Boolean)
	if (groups[0] === ICON_GROUP)
		return { kind: 'icon', package: ICON_PACKAGE, export: `${component.name}Icon` }
	if (groups[0] === INTERNAL_GROUP) return { kind: 'internal' }

	const exportName = [
		...(groups[0] === COMPONENTS_GROUP ? groups.slice(1) : groups),
		component.name,
	].join('')

	const mappedProps = Object.entries(exceptionsRecord?.props ?? {})
	const props: Record<string, LinkedProp> = {}
	const unresolved: UnresolvedVariantValue[] = []
	for (const [variantProperty, value] of Object.entries(component.variantProperties)) {
		const mapped = mappedProps.find(([, { from }]) => from === variantProperty)
		if (!mapped) {
			props[variantProperty] = { value: conventionValue(value), source: 'convention' }
			continue
		}
		const [prop, { map }] = mapped
		if (value in map) props[prop] = { value: map[value], source: 'exceptions-record' }
		else unresolved.push({ variantProperty, value })
	}

	return {
		kind: 'component',
		package: exceptionsRecord?.package ?? COMPONENT_PACKAGE,
		export: exportName,
		props,
		unresolved,
	}
}

/** Lower-cased with whitespace removed: how {@link findNearMiss} compares names. */
const loose = (name: string) => name.toLowerCase().replace(/\s+/g, '')

/**
 * The one candidate spelled like `name` ignoring case and whitespace (`Alert Dialog` →
 * `AlertDialog`), or `undefined` when none or several are. Names in the component link are
 * exact: this only suggests a fix for a failing name, it never resolves a link.
 *
 * @example
 * ```ts
 * // CJS
 * const { findNearMiss } = require('@brrritscold/design-core-js/component-link')
 * // ESM
 * import { findNearMiss } from '@brrritscold/design-core-js/component-link'
 *
 * findNearMiss('Alert Dialog', ['AlertDialog', 'Button']) // 'AlertDialog'
 * findNearMiss('Badge', ['AlertDialog', 'Button']) // undefined
 * ```
 */
export const findNearMiss = (name: string, candidates: Iterable<string>): string | undefined => {
	const key = loose(name)
	const matches = [...candidates].filter(
		(candidate) => candidate !== name && loose(candidate) === key
	)
	return matches.length === 1 ? matches[0] : undefined
}
