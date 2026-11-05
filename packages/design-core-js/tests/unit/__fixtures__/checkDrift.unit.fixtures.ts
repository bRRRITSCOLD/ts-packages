import type { CodeManifest } from '../../../src/code-manifest.js'
import type { DriftCheckInput } from '../../../src/drift-check.js'
import type {
	LibraryComponent,
	LibraryLayer,
	LibrarySnapshot,
} from '../../../src/library-snapshot.js'
import { TOKEN_THEMES, type TokenFile } from '../../../src/token-file.js'

/** A small token file in the shape of `tokens.json`: a fresh tree on every call. */
export const createTokenFile = (): TokenFile => ({
	primitive: {
		color: {
			white: { $type: 'color', $value: '#ffffff' },
			neutral: {
				100: { $type: 'color', $value: '#f5f5f5' },
				900: { $type: 'color', $value: '#171717' },
			},
		},
		'border-radius': { lg: { $type: 'borderRadius', $value: '10px' } },
		shadow: {
			xs: {
				$type: 'shadow',
				$value: {
					color: '#0000000d',
					offsetX: '0px',
					offsetY: '1px',
					blur: '2px',
					spread: '0px',
				},
			},
		},
	},
	light: {
		primary: { $type: 'color', $value: '{color.neutral.900}' },
		'primary-foreground': { $type: 'color', $value: '{color.white}' },
		radius: { $type: 'borderRadius', $value: '{border-radius.lg}' },
	},
	dark: {
		primary: { $type: 'color', $value: '{color.neutral.100}' },
		'primary-foreground': { $type: 'color', $value: '{color.neutral.900}' },
		radius: { $type: 'borderRadius', $value: '{border-radius.lg}' },
	},
})

/** A library component under `Components/` with no variants, parts, exceptions record or layers. */
export const createLibraryComponent = (
	overrides: Partial<LibraryComponent> & Pick<LibraryComponent, 'name'>
): LibraryComponent => ({
	path: 'Components',
	variantProperties: {},
	parts: {},
	layers: {},
	...overrides,
})

/** A layer of a main component with tokens on the given attributes and nothing unbound. */
export const createLibraryLayer = (overrides: Partial<LibraryLayer> = {}): LibraryLayer => ({
	namePath: ['Button'],
	appliedTokens: {},
	unbound: [],
	...overrides,
})

/** A library snapshot whose token catalog and themes are what token sync writes. */
export const createLibrarySnapshot = (
	components: Record<string, LibraryComponent>
): LibrarySnapshot => ({
	schemaVersion: 2,
	penpotVersion: '2.18.6',
	libraryFileId: 'library-file',
	tokens: createTokenFile(),
	tokenThemes: TOKEN_THEMES.map((theme) => ({ ...theme, sets: [...theme.sets] })),
	components,
})

/** Button's exceptions record: the variant property `state` sets the boolean prop `disabled`. */
export const mapsStateToDisabled = {
	v: 1,
	props: { disabled: { from: 'state', map: { Default: false, Disabled: true } } },
}

/** Button's layers: the board takes `primary` and `radius`, its Label `primary-foreground`. */
const buttonLayers = (): LibraryComponent['layers'] => ({
	'button-board': createLibraryLayer({
		appliedTokens: { fill: 'primary', r1: 'radius', r2: 'radius', r3: 'radius', r4: 'radius' },
	}),
	'button-label': createLibraryLayer({
		namePath: ['Button', 'Label'],
		appliedTokens: { fill: 'primary-foreground' },
	}),
})

/**
 * A design system library in step with core-react: Button (two variants, `state` mapped
 * to `disabled` by its exceptions record, every checked attribute bound to a semantic token),
 * Card with a Header part and a Content part holding a slot placeholder, and the Trash2 icon.
 */
export const createInStepLibrary = (): Record<string, LibraryComponent> => ({
	'button-default': createLibraryComponent({
		name: 'Button',
		variantProperties: { variant: 'default', size: 'default', state: 'Default' },
		exceptionsRecord: mapsStateToDisabled,
		layers: buttonLayers(),
	}),
	'button-outline-sm-disabled': createLibraryComponent({
		name: 'Button',
		variantProperties: { variant: 'outline', size: 'sm', state: 'Disabled' },
		exceptionsRecord: mapsStateToDisabled,
		layers: buttonLayers(),
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

/**
 * Drift-check input with the in-step library, its code manifest, the token file its catalog
 * was synced from and `cn` allowlisted.
 */
export const createDriftCheckInput = (
	components: Record<string, LibraryComponent> = createInStepLibrary(),
	manifest: CodeManifest = createCodeManifest()
): DriftCheckInput => ({
	snapshot: createLibrarySnapshot(components),
	manifest,
	tokens: createTokenFile(),
	config: { allowlist: ['cn'] },
})
