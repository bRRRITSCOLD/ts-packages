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

/**
 * A fake shape: `tokens` maps a property to a token name, as Penpot's `shape.tokens` does, and
 * `resolved` holds the value each property last resolved to, which only `applyToken` refreshes.
 */
export type FakeShape = PenpotShape & {
	tokens: Record<string, string>
	resolved: Record<string, unknown>
	children: FakeShape[]
	detached: boolean
}

/**
 * A shape applying the given tokens, each resolved to `resolved[property]`. `applyToken`
 * toggles, as Penpot's does: a property already applying the token loses it, any other takes it
 * and resolves the token's current value. `fills` and `fontFamily` read `resolved` the way the
 * script reads Penpot's attributes.
 *
 * A `stubborn` shape ignores `applyToken`, like a shape Penpot won't re-point; a `racy` one drops
 * every second call, like a toggle back on that landed before the toggle off settled; a `stale`
 * one takes the token but keeps resolving the old value; a `copy` is a component copy. A copy
 * that `follows` a main mirrors the main's tokens and resolved values `lag` reads after they
 * change, as Penpot carries a main's change to its copies, until `applyToken` on the copy
 * detaches it.
 */
export const createShape = (
	name: string,
	tokens: Record<string, string> = {},
	{
		children = [],
		stubborn = false,
		racy = false,
		stale = false,
		copy = false,
		follows,
		lag = 0,
		resolved = {},
	}: {
		children?: FakeShape[]
		stubborn?: boolean
		racy?: boolean
		stale?: boolean
		copy?: boolean
		follows?: FakeShape
		lag?: number
		resolved?: Record<string, unknown>
	} = {}
): FakeShape => {
	let calls = 0
	const own = { tokens: { ...tokens }, resolved: { ...resolved } }
	// What the copy shows of its main: the main's state as of `lag` reads after it last changed.
	let detached = !follows
	let seen = follows ? JSON.stringify([follows.tokens, follows.resolved]) : ''
	let shown = follows ? { tokens: { ...follows.tokens }, resolved: { ...follows.resolved } } : own
	let reads = 0
	const current = () => {
		if (detached || !follows) return own
		const now = JSON.stringify([follows.tokens, follows.resolved])
		if (now !== seen) {
			seen = now
			reads = 0
		}
		if (++reads > lag)
			shown = { tokens: { ...follows.tokens }, resolved: { ...follows.resolved } }
		return shown
	}
	const shape = {
		id: `shape-${name}`,
		name,
		children,
		get tokens() {
			return current().tokens
		},
		get resolved() {
			return current().resolved
		},
		get fills() {
			const { fill } = current().resolved
			return fill === undefined ? [] : [{ fillColor: String(fill) }]
		},
		get fontFamily() {
			const family = current().resolved.fontFamily
			return family === undefined ? undefined : JSON.stringify(family)
		},
		isComponentCopyInstance: () => copy || Boolean(follows),
		applyToken: (token: PenpotToken, properties: string[]) => {
			calls++
			if (stubborn || (racy && calls % 2 === 0)) return
			if (!detached) {
				const { tokens: mirrored, resolved: values } = current()
				own.tokens = { ...mirrored }
				own.resolved = { ...values }
				detached = true
			}
			for (const property of properties)
				if (own.tokens[property] === token.name) {
					delete own.tokens[property]
					delete own.resolved[property]
				} else {
					own.tokens[property] = token.name
					if (!stale) own.resolved[property] = token.value
				}
		},
		/** Whether `applyToken` detached this copy from the main it followed. */
		get detached() {
			return Boolean(follows) && detached
		},
	}
	return shape as FakeShape
}

/** What the fake file holds before a sync: sets of `{ type, value }` by name, themes, pages. */
export type FakeFileState = {
	sets?: { name: string; tokens: Record<string, { type: string; value: unknown }> }[]
	themes?: (TokenTheme & { active?: boolean })[]
	pages?: { name: string; root: FakeShape }[]
}

/** How the fake's writes misbehave, to stand in for a Penpot that refuses one. */
export type FakeBehaviour = {
	/**
	 * What assigning `token.value` does: store it (the default, as the plugin typings declare),
	 * throw, or silently keep the old value.
	 */
	valueSetter?: 'works' | 'throws' | 'ignored'
	/** `addToken` throws, like Penpot's validation did in #120, when this returns true. */
	failAdd?: (token: { type: string; name: string; value: unknown }) => boolean
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
 * theme taking a set object, one active theme per group. `writes` counts every write; set
 * `behaviour` to make later writes misbehave.
 */
export const createFakePenpot = (state: FakeFileState = {}) => {
	let nextId = 0
	const id = () => `id-${++nextId}`
	const fake: { writes: number; behaviour: FakeBehaviour } = { writes: 0, behaviour: {} }
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
				if (fake.behaviour.failAdd?.({ type, name: tokenName, value }))
					throw new Error(
						'Value not valid: Field 0.name is invalid: Empty field. Field value is invalid: Token has circular reference'
					)
				let stored = store(type, value)
				const token: PenpotToken = {
					name: tokenName,
					type,
					get value() {
						return stored
					},
					set value(next) {
						const setter = fake.behaviour.valueSetter ?? 'works'
						if (setter === 'throws') throw new Error('Object is not extensible')
						write()
						if (setter === 'works') stored = store(type, next)
					},
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
