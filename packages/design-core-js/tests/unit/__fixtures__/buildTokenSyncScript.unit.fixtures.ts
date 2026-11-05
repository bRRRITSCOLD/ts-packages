import type { DesignTokenGroup, TokenFile, TokenTheme } from '../../../src/token-file.js'
import type {
	PenpotShape,
	PenpotToken,
	PenpotTokenSet,
	PenpotTokenTheme,
	TokenSyncPenpot,
	TokenSyncResult,
} from '../../../src/token-sync.js'

/**
 * A token file with every value form Penpot rewrites: a number, a font-family string, a bare
 * shadow and a list of shadow layers. A fresh tree on every call.
 */
export const createTokenFile = (): TokenFile => ({
	primitive: {
		color: {
			white: { $type: 'color', $value: '#ffffff' },
			neutral: { 900: { $type: 'color', $value: '#171717' } },
		},
		'font-family': { sans: { $type: 'fontFamilies', $value: 'ui-sans-serif, system-ui' } },
		'font-weight': { medium: { $type: 'fontWeights', $value: 500 } },
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
			sm: {
				$type: 'shadow',
				$value: [
					{
						color: '#0000001a',
						offsetX: '0px',
						offsetY: '1px',
						blur: '3px',
						spread: '0px',
					},
					{
						color: '#0000001a',
						offsetX: '0px',
						offsetY: '1px',
						blur: '2px',
						spread: '0px',
					},
				],
			},
		},
	},
	light: {
		primary: { $type: 'color', $value: '{color.neutral.900}', $description: 'Brand fill' },
	},
	dark: {
		primary: { $type: 'color', $value: '{color.white}', $description: 'Brand fill' },
	},
})

/** A fake shape: `tokens` maps a property to a token name, as Penpot's `shape.tokens` does. */
export type FakeShape = PenpotShape & { tokens: Record<string, string>; children: FakeShape[] }

/**
 * A shape applying the given tokens. A `stubborn` shape ignores `applyToken`, like a shape
 * Penpot won't re-point.
 */
export const createShape = (
	name: string,
	tokens: Record<string, string> = {},
	{ children = [], stubborn = false }: { children?: FakeShape[]; stubborn?: boolean } = {}
): FakeShape => {
	const shape: FakeShape = {
		id: `shape-${name}`,
		name,
		tokens: { ...tokens },
		children,
		applyToken: (token, properties) => {
			if (stubborn) return
			for (const property of properties) shape.tokens[property] = token.name
		},
	}
	return shape
}

/** What the fake file holds before a sync: sets of `{ type, value }` by name, themes, pages. */
export type FakeFileState = {
	sets?: { name: string; tokens: Record<string, { type: string; value: unknown }> }[]
	themes?: (TokenTheme & { active?: boolean })[]
	pages?: { name: string; root: FakeShape }[]
}

/** How Penpot 2.18.6 stores a value: numbers as strings, font families as a list, shadows as layers. */
const store = (type: string, value: unknown): unknown => {
	if (typeof value === 'number') return String(value)
	if (type === 'fontFamilies' && typeof value === 'string')
		return value.split(',').map((family) => family.trim())
	if (type === 'shadow' && typeof value === 'object' && value !== null) {
		const layers = (Array.isArray(value) ? value : [value]).map((layer) => ({
			inset: false,
			...layer,
		}))
		if (layers.some(({ spread }) => Number.parseFloat(String(spread)) < 0))
			throw new Error('Spread value cannot be negative')
		return layers
	}
	return value
}

/**
 * An in-memory fake of the parts of Penpot 2.18.6's plugin API token sync uses, behaving as
 * the first manual sync found it: values stored in Penpot's form, `addSet` / `removeSet` on a
 * theme taking a set object, one active theme per group. `writes` counts every write.
 */
export const createFakePenpot = (state: FakeFileState = {}) => {
	let nextId = 0
	const id = () => `id-${++nextId}`
	const fake = { writes: 0 }
	const write = () => {
		fake.writes++
	}
	const sets: PenpotTokenSet[] = []
	const themes: PenpotTokenTheme[] = []

	const createSet = (name: string): PenpotTokenSet => {
		const set: PenpotTokenSet = {
			id: id(),
			name,
			tokens: [],
			addToken: ({ type, name: tokenName, value }) => {
				write()
				if (set.tokens.some((token) => token.name === tokenName))
					throw new Error(`A token named ${tokenName} already exists`)
				const token: PenpotToken = {
					name: tokenName,
					type,
					value: store(type, value),
					description: '',
					remove: () => {
						write()
						set.tokens.splice(set.tokens.indexOf(token), 1)
					},
				}
				set.tokens.push(token)
				return token
			},
			remove: () => {
				write()
				sets.splice(sets.indexOf(set), 1)
				for (const theme of themes)
					theme.activeSets = theme.activeSets.filter((active) => active !== set)
			},
		}
		sets.push(set)
		return set
	}

	const asSet = (set: PenpotTokenSet) => {
		if (typeof set !== 'object' || !set.id) throw new Error('should be an uuid')
		return set
	}

	const createTheme = (group: string, name: string): PenpotTokenTheme => {
		const theme: PenpotTokenTheme = {
			id: id(),
			group,
			name,
			active: false,
			activeSets: [],
			addSet: (set) => {
				write()
				theme.activeSets = [...theme.activeSets, asSet(set)]
			},
			removeSet: (set) => {
				write()
				theme.activeSets = theme.activeSets.filter((active) => active !== asSet(set))
			},
			toggleActive: () => {
				write()
				for (const other of themes) if (other.group === group) other.active = false
				theme.active = true
			},
			remove: () => {
				write()
				themes.splice(themes.indexOf(theme), 1)
			},
		}
		themes.push(theme)
		return theme
	}

	for (const { name, tokens } of state.sets ?? []) {
		const set = createSet(name)
		for (const [tokenName, { type, value }] of Object.entries(tokens))
			set.addToken({ type, name: tokenName, value })
	}
	for (const { group, name, sets: enabled, active } of state.themes ?? []) {
		const theme = createTheme(group, name)
		theme.activeSets = sets.filter((set) => enabled.includes(set.name))
		theme.active = active ?? false
	}
	fake.writes = 0

	const penpot: TokenSyncPenpot = {
		library: {
			local: {
				tokens: {
					get sets() {
						return [...sets]
					},
					get themes() {
						return [...themes]
					},
					addSet: ({ name }) => {
						write()
						return createSet(name)
					},
					addTheme: ({ group, name }) => {
						write()
						return createTheme(group, name)
					},
				},
			},
		},
		currentFile: { pages: state.pages ?? [] },
	}
	return Object.assign(fake, { penpot })
}

/** The fake file's catalog in the library snapshot's form: sets as DTCG trees, themes sorted. */
export const readCatalog = ({ penpot }: ReturnType<typeof createFakePenpot>) => {
	const { sets, themes } = penpot.library.local.tokens
	const tokens: Record<string, DesignTokenGroup> = {}
	for (const set of sets) {
		const tree: DesignTokenGroup = {}
		for (const { name, type, value, description } of set.tokens) {
			const path = name.split('.')
			let group = tree
			for (const segment of path.slice(0, -1))
				group = (group[segment] ??= {}) as DesignTokenGroup
			group[path[path.length - 1]] = {
				$type: type,
				$value: value,
				...(description ? { $description: description } : {}),
			}
		}
		tokens[set.name] = tree
	}
	return {
		setOrder: sets.map(({ name }) => name),
		tokens,
		tokenThemes: themes.map(({ group, name, activeSets }) => ({
			group,
			name,
			sets: activeSets.map((set) => set.name).sort(),
		})),
		activeThemes: themes
			.filter(({ active }) => active)
			.map(({ group, name }) => `${group}/${name}`),
	}
}

const AsyncFunction = (async () => {}).constructor as new (
	...args: string[]
) => (...args: unknown[]) => Promise<unknown>

/** Runs a script the way `execute_code` does: as an async function body with Penpot's globals. */
export const runScript = (script: string, { penpot }: ReturnType<typeof createFakePenpot>) =>
	new AsyncFunction('penpot', 'penpotUtils', 'storage', script)(
		penpot,
		{},
		{}
	) as Promise<TokenSyncResult>
