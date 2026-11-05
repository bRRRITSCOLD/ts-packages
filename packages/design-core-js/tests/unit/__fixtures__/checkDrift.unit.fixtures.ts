import type { CodeManifest } from '../../../src/code-manifest.js'
import type { DriftCheckInput } from '../../../src/drift-check.js'
import type { LibraryComponent, LibrarySnapshot } from '../../../src/library-snapshot.js'

/** A library component under `Components/` with no variants, parts or exceptions record. */
export const createLibraryComponent = (
	overrides: Partial<LibraryComponent> & Pick<LibraryComponent, 'name'>
): LibraryComponent => ({
	path: 'Components',
	variantProperties: {},
	parts: {},
	...overrides,
})

export const createLibrarySnapshot = (
	components: Record<string, LibraryComponent>
): LibrarySnapshot => ({
	schemaVersion: 1,
	penpotVersion: '2.18.6',
	libraryFileId: 'library-file',
	components,
})

/** Button's exceptions record: the variant property `state` sets the boolean prop `disabled`. */
export const mapsStateToDisabled = {
	v: 1,
	props: { disabled: { from: 'state', map: { Default: false, Disabled: true } } },
}

/**
 * A design system library in step with core-react: Button (two variants, `state` mapped
 * to `disabled` by its exceptions record), Card with a Header part and a Content part
 * holding a slot placeholder, and the Trash2 icon.
 */
export const createInStepLibrary = (): Record<string, LibraryComponent> => ({
	'button-default': createLibraryComponent({
		name: 'Button',
		variantProperties: { variant: 'default', size: 'default', state: 'Default' },
		exceptionsRecord: mapsStateToDisabled,
	}),
	'button-outline-sm-disabled': createLibraryComponent({
		name: 'Button',
		variantProperties: { variant: 'outline', size: 'sm', state: 'Disabled' },
		exceptionsRecord: mapsStateToDisabled,
	}),
	card: createLibraryComponent({
		name: 'Card',
		parts: { Header: { componentId: 'card-header' }, Content: { componentId: 'card-content' } },
	}),
	'card-header': createLibraryComponent({ path: 'Components/Card', name: 'Header' }),
	'card-content': createLibraryComponent({
		path: 'Components/Card',
		name: 'Content',
		parts: { Body: { componentId: 'slot' } },
		exceptionsRecord: { v: 1, slots: ['Body'] },
	}),
	slot: createLibraryComponent({ path: '_internal', name: 'Slot' }),
	'icon-trash-2': createLibraryComponent({ path: 'icon', name: 'Trash2' }),
})

/** The code manifest of the core-react the in-step library mirrors. */
export const createCodeManifest = (): CodeManifest => ({
	exports: {
		Button: {
			props: {
				disabled: { type: 'boolean', optional: true },
				size: { type: 'literals', values: ['default', 'sm'], optional: true },
				variant: { type: 'literals', values: ['default', 'outline'], optional: true },
			},
		},
		Card: { props: {} },
		CardContent: { props: {} },
		CardHeader: { props: {} },
		cn: { props: {} },
	},
	icons: ['BellIcon', 'Trash2Icon'],
})

/** Drift-check input with the in-step library, its code manifest and `cn` allowlisted. */
export const createDriftCheckInput = (
	components: Record<string, LibraryComponent> = createInStepLibrary(),
	manifest: CodeManifest = createCodeManifest()
): DriftCheckInput => ({
	snapshot: createLibrarySnapshot(components),
	manifest,
	config: { allowlist: ['cn'] },
})
