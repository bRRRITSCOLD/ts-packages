import { z } from '@brrritscold/core-js/zod'

import {
	type DesignToken,
	flattenTokens,
	sameToken,
	TOKEN_THEMES,
	type TokenFile,
	type TokenTheme,
} from './token-file.js'

/**
 * One token migration, an entry of core-react's append-only `design/token-migrations.json`:
 * the token `from` was renamed to `to` in `version`, or removed with no replacement
 * (`to: null`).
 */
export const tokenMigrationSchema = z.strictObject({
	version: z.string(),
	from: z.string(),
	to: z.string().nullable(),
})

/** One token migration; see {@link tokenMigrationSchema}. */
export type TokenMigration = z.infer<typeof tokenMigrationSchema>

/** `design/token-migrations.json`: every token migration, oldest first. */
export const tokenMigrationsSchema = z.array(tokenMigrationSchema)

/** Every token name in a token file, across its sets: `color.neutral.50`, `primary`. */
const tokenNames = (tokenFile: TokenFile) =>
	new Set(Object.values(tokenFile).flatMap((set) => Object.keys(flattenTokens(set))))

/**
 * The tokens `base` has and `head` doesn't, with no `design/token-migrations.json` entry naming
 * them as `from`, sorted. A token counts as removed only when it is gone from every set. CI
 * fails on any: a renamed or removed token needs a migration, so token sync can re-bind the
 * shapes that apply it and apps can rewrite their utility classes.
 */
export const findUnmigratedTokens = ({
	base,
	head,
	migrations,
}: {
	base: TokenFile
	head: TokenFile
	migrations: TokenMigration[]
}): string[] => {
	const kept = tokenNames(head)
	const migrated = new Set(migrations.map(({ from }) => from))
	return [...tokenNames(base)].filter((name) => !kept.has(name) && !migrated.has(name)).sort()
}

/**
 * A shape token sync leaves for a human: it applies a migrated token `from` that has no
 * replacement (`to: null`), still applies it after the sync re-pointed it, or doesn't read back
 * a token whose value changed after the sync re-applied it.
 */
export type FlaggedShape = {
	page: string
	shapeId: string
	shape: string
	/** The migrated token the shape still applies, or the changed token it should apply. */
	token: string
	/** The properties it applies the token on, as `shape.tokens` names them. */
	properties: string[]
	reason: string
}

/**
 * What the token sync script returns: one line per change it made (none on a file already in
 * sync) and the shapes it flagged.
 */
export type TokenSyncResult = { changes: string[]; flagged: FlaggedShape[] }

/** A token as the Penpot 2.18.6 plugin API holds it; `value` and `description` are writable. */
export type PenpotToken = {
	name: string
	type: string
	value: unknown
	description: string
	remove: () => void
}

/** A token set as the Penpot 2.18.6 plugin API holds it. */
export type PenpotTokenSet = {
	id: string
	name: string
	tokens: PenpotToken[]
	addToken: (token: { type: string; name: string; value: unknown }) => PenpotToken
	remove: () => void
}

/** A token theme as the Penpot 2.18.6 plugin API holds it; `addSet` takes the set, not a name. */
export type PenpotTokenTheme = {
	id: string
	group: string
	name: string
	active: boolean
	activeSets: PenpotTokenSet[]
	addSet: (set: PenpotTokenSet) => void
	removeSet: (set: PenpotTokenSet) => void
	toggleActive: () => void
	remove: () => void
}

/** A shape as the Penpot 2.18.6 plugin API holds it: `tokens` maps a property to a token name. */
export type PenpotShape = {
	id: string
	name: string
	tokens?: Record<string, string>
	children?: PenpotShape[]
	applyToken: (token: PenpotToken, properties: string[]) => void
	/** Whether the shape is a component copy; re-applying a token reaches copies last. */
	isComponentCopyInstance?: () => boolean
}

/**
 * The slice of the Penpot 2.18.6 plugin API (`execute_code`'s `penpot` global) the token sync
 * script uses: the open file's token catalog and its pages.
 */
export type TokenSyncPenpot = {
	library: {
		local: {
			tokens: {
				sets: PenpotTokenSet[]
				themes: PenpotTokenTheme[]
				addSet: (set: { name: string }) => PenpotTokenSet
				addTheme: (theme: { group: string; name: string }) => PenpotTokenTheme
			}
		}
	}
	currentFile: { pages: { name: string; root: PenpotShape }[] } | null
}

/** What {@link buildTokenSyncScript} turns into a script. */
export type TokenSyncInput = {
	/** core-react's `tokens/tokens.json`. */
	tokens: TokenFile
	/** core-react's `design/token-migrations.json`; none when omitted. */
	migrations?: TokenMigration[]
	/**
	 * Milliseconds to wait after each batch of writes, since Penpot applies them asynchronously
	 * (default 300). Tests pass 0.
	 */
	pauseMs?: number
}

/** The data the generated script syncs to, embedded in it as JSON. */
type TokenSyncPlan = {
	/** The token file's sets in its order, each with its tokens by full name. */
	sets: { name: string; tokens: Record<string, DesignToken> }[]
	themes: readonly TokenTheme[]
	/** The theme to activate when no theme of its group is active. */
	defaultTheme: { group: string; name: string }
	/** The migrations still to apply, each `to` resolved to a token of the token file. */
	migrations: { from: string; to: string | null }[]
	pauseMs: number
}

const DEFAULT_PAUSE_MS = 300

/** A shadow layer's spread, as a number of pixels. */
const spreadOf = (layer: unknown) =>
	Number.parseFloat(String((layer as { spread?: unknown } | null)?.spread ?? 0))

/**
 * Why Penpot can't hold a token, or `undefined` when it can: it rejects a negative shadow
 * spread, and stores a CSS-string shadow that never resolves.
 */
const unsupported = ({ $type, $value }: DesignToken): string | undefined => {
	if ($type !== 'shadow') return undefined
	if (typeof $value === 'string')
		return /^\{[^}]+\}$/.test($value)
			? undefined
			: 'a CSS-string shadow, which Penpot stores but never resolves'
	if ((Array.isArray($value) ? $value : [$value]).some((layer) => spreadOf(layer) < 0))
		return 'a negative shadow spread, which Penpot rejects'
	return undefined
}

/**
 * The migrations still to apply: those whose `from` is no longer a token of the token file,
 * each `to` followed through later migrations to a token the token file has (or `null`).
 */
const resolveMigrations = (
	migrations: TokenMigration[],
	tokenNames: Set<string>
): TokenSyncPlan['migrations'] =>
	migrations
		.filter(({ from }) => !tokenNames.has(from))
		.map(({ from, to }) => {
			const seen = new Set([from])
			let target = to
			while (target !== null && !tokenNames.has(target)) {
				const next = migrations.find((migration) => migration.from === target)
				if (!next || seen.has(target))
					throw new Error(
						`Token migration \`${from}\` → \`${to}\`: \`${target}\` is not in tokens.json and no later migration renames it`
					)
				seen.add(target)
				target = next.to
			}
			return { from, to: target }
		})

/**
 * The script itself, run inside Penpot with the plan and the shared {@link sameToken}. It is
 * embedded in the generated script by its source text, so it references nothing outside its
 * own body.
 */
const syncTokens = async (
	penpot: TokenSyncPenpot,
	plan: TokenSyncPlan,
	isSameToken: typeof sameToken
): Promise<TokenSyncResult> => {
	const catalog = penpot.library.local.tokens
	const changes: string[] = []
	const flagged: FlaggedShape[] = []
	const pause = () => new Promise((resolve) => setTimeout(resolve, plan.pauseMs))
	const setNamed = (name: string) => catalog.sets.find((set) => set.name === name)
	const themeLabel = ({ group, name }: { group: string; name: string }) => `${group}/${name}`
	const isTheme =
		(expected: { group: string; name: string }) =>
		({ group, name }: { group: string; name: string }) =>
			group === expected.group && name === expected.name

	// Migrations apply to a `from` still in the file, so decide them before the catalog changes.
	const inFile = new Set(catalog.sets.flatMap((set) => set.tokens.map(({ name }) => name)))
	const migrations = plan.migrations.filter(({ from }) => inFile.has(from))
	const migrating = new Set(migrations.map(({ from }) => from))

	// Sets: the token file's, created in its order.
	let wrote = false
	for (const { name } of plan.sets)
		if (!setNamed(name)) {
			catalog.addSet({ name })
			changes.push(`add set \`${name}\``)
			wrote = true
		}
	if (wrote) await pause()

	// Tokens: a token that differs takes the new value in place (`token.value` is writable), so
	// its id and the shapes applying it stay put. When Penpot refuses that, or the type changed,
	// it is removed and added again, one token at a time; an add that fails twice restores the old
	// token, so a failure never leaves the file without it (#120). An extra token is removed,
	// unless a migration decides it below.
	const asToken = ({ type, value, description }: PenpotToken): DesignToken => ({
		$type: type,
		$value: value,
		...(description ? { $description: description } : {}),
	})
	const sameValue = (a: DesignToken, b: DesignToken) =>
		isSameToken({ $type: a.$type, $value: a.$value }, { $type: b.$type, $value: b.$value })
	const tokenIn = (set: PenpotTokenSet, name: string) =>
		set.tokens.find((token) => token.name === name)
	type Pending = { set: PenpotTokenSet; name: string; expected: DesignToken; old: DesignToken }
	const updates: Pending[] = []
	const replacements: Pending[] = []
	const additions: { set: PenpotTokenSet; name: string; token: DesignToken }[] = []
	// Tokens whose value changed: the shapes applying them are re-applied below.
	const revalued = new Set<string>()
	wrote = false
	for (const { name: setName, tokens } of plan.sets) {
		const set = setNamed(setName)
		if (!set) throw new Error(`Token set \`${setName}\` was not created`)
		const present = new Set(set.tokens.map(({ name }) => name))
		for (const existing of [...set.tokens]) {
			const expected = Object.hasOwn(tokens, existing.name)
				? tokens[existing.name]
				: undefined
			const found = asToken(existing)
			if (expected && isSameToken(expected, found)) continue
			if (!expected && migrating.has(existing.name)) continue
			wrote = true
			if (!expected) {
				existing.remove()
				changes.push(`remove token \`${setName}/${existing.name}\``)
				continue
			}
			const pending = {
				set,
				name: existing.name,
				expected,
				old: JSON.parse(JSON.stringify(found)) as DesignToken,
			}
			if (existing.type !== expected.$type) {
				replacements.push(pending)
				continue
			}
			try {
				// The value setter's form, per the plugin typings: a string, or a list of shadow layers.
				const { $type, $value } = expected
				if (!sameValue(expected, found))
					existing.value =
						typeof $value === 'number'
							? String($value)
							: $type === 'shadow' && $value && typeof $value === 'object'
								? Array.isArray($value)
									? $value
									: [$value]
								: $value
				if ((expected.$description ?? '') !== existing.description)
					existing.description = expected.$description ?? ''
				updates.push(pending)
			} catch {
				replacements.push(pending)
			}
		}
		for (const [name, token] of Object.entries(tokens))
			if (!present.has(name)) additions.push({ set, name, token })
	}
	if (wrote) await pause()
	// An in-place write that didn't read back after the pause falls back to a replacement.
	for (const pending of updates) {
		const { set, name, expected, old } = pending
		const now = tokenIn(set, name)
		if (!now || !isSameToken(expected, asToken(now))) {
			replacements.push(pending)
			continue
		}
		changes.push(`update token \`${set.name}/${name}\``)
		if (!sameValue(expected, old)) revalued.add(name)
	}
	// What `addToken` takes: tokens.json's form, a font family list joined as tokens.json writes it.
	const payload = (name: string, { $type, $value }: DesignToken) => ({
		type: $type,
		name,
		value: $type === 'fontFamilies' && Array.isArray($value) ? $value.join(', ') : $value,
	})
	const add = (set: PenpotTokenSet, name: string, token: DesignToken) => {
		const added = set.addToken(payload(name, token))
		if (token.$description) added.description = token.$description
	}
	const message = (error: unknown) => (error instanceof Error ? error.message : String(error))
	const failures: string[] = []
	for (const { set, name, expected, old } of replacements) {
		tokenIn(set, name)?.remove()
		await pause()
		let failure: unknown
		let added = false
		for (let attempt = 0; attempt < 2 && !added; attempt++)
			try {
				add(set, name, expected)
				added = true
			} catch (error) {
				failure = error
				await pause()
			}
		const label = `${set.name}/${name}`
		if (added) {
			changes.push(`replace token \`${label}\``)
			if (!sameValue(expected, old)) revalued.add(name)
			continue
		}
		try {
			add(set, name, old)
			failures.push(
				`\`${label}\`: adding the new value failed twice (${message(failure)}); the old token was restored`
			)
		} catch (error) {
			failures.push(
				`\`${label}\`: adding the new value failed twice (${message(failure)}), and restoring the old token failed too (${message(error)}). Re-add it by hand in set \`${set.name}\`: addToken(${JSON.stringify(payload(name, old))})`
			)
		}
	}
	for (const { set, name, token } of additions) {
		add(set, name, token)
		changes.push(`add token \`${set.name}/${name}\``)
	}
	if (additions.length || replacements.length) await pause()

	// Every shape on every page, read only when a migration or a re-apply needs them.
	const shapes: { page: string; shape: PenpotShape }[] = []
	if (migrations.length || revalued.size)
		for (const page of penpot.currentFile?.pages ?? []) {
			const stack = [page.root]
			while (stack.length) {
				const shape = stack.pop() as PenpotShape
				shapes.push({ page: page.name, shape })
				stack.push(...(shape.children ?? []))
			}
		}
	const usersOf = (token: string) =>
		shapes.flatMap(({ page, shape }) => {
			const properties = Object.entries(shape.tokens ?? {})
				.filter(([, applied]) => applied === token)
				.map(([property]) => property)
			return properties.length ? [{ page, shape, properties }] : []
		})

	// Re-apply: Penpot doesn't re-resolve the shapes applying a token whose value changed, nor
	// those applying a token that references it (#120). Each is toggled off and back on across
	// pauses, since applying a token toggles it and settles asynchronously; non-copies go first so
	// plain copies have followed their mains before their turn. A shape whose token doesn't read
	// back afterwards is flagged.
	const allTokens = () => catalog.sets.flatMap((set) => set.tokens)
	const references = ({ value }: PenpotToken) =>
		(JSON.stringify(value ?? '').match(/\{[^{}]+\}/g) ?? []).map((ref) => ref.slice(1, -1))
	for (let grew = revalued.size > 0; grew; ) {
		grew = false
		for (const token of allTokens())
			if (!revalued.has(token.name) && references(token).some((name) => revalued.has(name))) {
				revalued.add(token.name)
				grew = true
			}
	}
	const jobs = [...revalued].flatMap((name) => {
		const token = allTokens().find((candidate) => candidate.name === name)
		return token ? usersOf(name).map((user) => ({ ...user, token })) : []
	})
	const isCopy = ({ shape }: { shape: PenpotShape }) => shape.isComponentCopyInstance?.() ?? false
	for (const batch of [jobs.filter((job) => !isCopy(job)), jobs.filter(isCopy)]) {
		if (!batch.length) continue
		for (const { shape, token, properties } of batch) shape.applyToken(token, properties)
		await pause()
		for (const { shape, token, properties } of batch) shape.applyToken(token, properties)
		await pause()
		for (const { page, shape, token, properties } of batch)
			if (properties.every((property) => shape.tokens?.[property] === token.name))
				changes.push(
					`re-apply \`${token.name}\` on ${properties.join(', ')} of \`${shape.name}\` (${shape.id}) on page \`${page}\``
				)
			else
				flagged.push({
					page,
					shapeId: shape.id,
					shape: shape.name,
					token: token.name,
					properties,
					reason: `\`${token.name}\` changed value and re-applying it did not read back: apply it again on ${properties.join(', ')}`,
				})
	}

	// Migrations: re-point every shape that applies `from` to `to`, on the same properties.
	const flag = (token: string, reason: string) =>
		usersOf(token).map(({ page, shape, properties }) =>
			flagged.push({ page, shapeId: shape.id, shape: shape.name, token, properties, reason })
		)
	const kept = new Set<string>()
	for (const { from, to } of migrations) {
		if (to !== null) {
			const target = catalog.sets.flatMap((set) => set.tokens).find(({ name }) => name === to)
			if (!target) throw new Error(`Token \`${to}\` was not created`)
			const users = usersOf(from)
			for (const { page, shape, properties } of users) {
				shape.applyToken(target, properties)
				changes.push(
					`re-point \`${from}\` → \`${to}\` on ${properties.join(', ')} of \`${shape.name}\` (${shape.id}) on page \`${page}\``
				)
			}
			if (users.length) await pause()
		}
		if (usersOf(from).length) {
			flag(
				from,
				to === null
					? `\`${from}\` was removed with no replacement`
					: `still applies \`${from}\` after re-pointing it to \`${to}\``
			)
			kept.add(from)
			continue
		}
		for (const set of catalog.sets)
			for (const token of set.tokens)
				if (token.name === from) {
					token.remove()
					changes.push(`remove migrated token \`${set.name}/${from}\``)
				}
	}

	// Sets the token file lacks, unless one holds a migrated token a shape still applies.
	const expectedSets = new Set(plan.sets.map(({ name }) => name))
	for (const set of [...catalog.sets])
		if (!expectedSets.has(set.name) && !set.tokens.some(({ name }) => kept.has(name))) {
			set.remove()
			changes.push(`remove set \`${set.name}\``)
		}

	// Themes: exactly the planned ones, each enabling exactly its sets.
	for (const theme of [...catalog.themes])
		if (!plan.themes.some((expected) => isTheme(expected)(theme))) {
			theme.remove()
			changes.push(`remove theme \`${themeLabel(theme)}\``)
		}
	wrote = false
	for (const expected of plan.themes)
		if (!catalog.themes.some(isTheme(expected))) {
			catalog.addTheme({ group: expected.group, name: expected.name })
			changes.push(`add theme \`${themeLabel(expected)}\``)
			wrote = true
		}
	if (wrote) await pause()
	for (const expected of plan.themes) {
		const theme = catalog.themes.find(isTheme(expected))
		if (!theme) throw new Error(`Token theme \`${themeLabel(expected)}\` was not created`)
		for (const set of [...theme.activeSets])
			if (!expected.sets.includes(set.name)) {
				theme.removeSet(set)
				changes.push(`theme \`${themeLabel(expected)}\`: disable set \`${set.name}\``)
			}
		for (const name of expected.sets)
			if (!theme.activeSets.some((set) => set.name === name)) {
				theme.addSet(setNamed(name) as PenpotTokenSet)
				changes.push(`theme \`${themeLabel(expected)}\`: enable set \`${name}\``)
			}
	}
	const { defaultTheme } = plan
	if (!catalog.themes.some(({ group, active }) => group === defaultTheme.group && active)) {
		catalog.themes.find(isTheme(defaultTheme))?.toggleActive()
		changes.push(`activate theme \`${themeLabel(defaultTheme)}\``)
	}
	if (failures.length)
		throw new Error(
			[
				'Token sync could not replace these tokens; it synced everything else:',
				...failures.map((failure) => `- ${failure}`),
				`Changes it made: ${JSON.stringify(changes)}`,
				`Flagged shapes: ${JSON.stringify(flagged)}`,
			].join('\n')
		)
	return { changes, flagged }
}

/**
 * Builds the token sync script: one self-contained JavaScript string, run as the body of a
 * Penpot MCP `execute_code` call in the target file's tab, that writes the token file into
 * that file. It leaves the file's catalog with exactly the token file's sets (`primitive`,
 * `light`, `dark`, created in that order) and tokens, and exactly the themes
 * {@link TOKEN_THEMES}, activating `Mode/Light` when no `Mode` theme is active. Values compare
 * with {@link sameToken}, the comparison drift rule 6 makes, embedded by its source text.
 *
 * A token whose value or description differs takes the new one in place. When Penpot refuses
 * that, or the type changed, the token is removed and added again; an add that fails twice
 * restores the old token, and the script throws once everything else is synced. Every shape
 * applying a token whose value changed (or a token referencing it) has it re-applied, toggled
 * off and back on, so it resolves the new value; one that doesn't read it back is flagged.
 *
 * Each migration whose `from` is still in the file adds `to`, re-applies it on every shape
 * whose `shape.tokens` names `from` (same properties) and removes `from` once no shape applies
 * it; shapes still applying it, or applying a `from` with `to: null`, are flagged.
 *
 * The script returns a {@link TokenSyncResult}; run on a file already in sync, `changes` is
 * empty. Throws, before any script exists, on a token Penpot can't hold (a negative shadow
 * spread, a CSS-string shadow) or a migration whose `to` never reaches a token of the file.
 *
 * @example
 * const script = buildTokenSyncScript({ tokens, migrations })
 * // execute_code({ code: script }) → { changes: ['add set `primitive`', …], flagged: [] }
 */
export const buildTokenSyncScript = ({
	tokens,
	migrations = [],
	pauseMs = DEFAULT_PAUSE_MS,
}: TokenSyncInput): string => {
	const sets = Object.entries(tokens).map(([name, group]) => ({
		name,
		tokens: flattenTokens(group),
	}))
	const problems = sets.flatMap(({ name: set, tokens: setTokens }) =>
		Object.entries(setTokens).flatMap(([name, token]) => {
			const reason = unsupported(token)
			return reason ? [`\`${set}/${name}\`: ${reason}`] : []
		})
	)
	if (problems.length)
		throw new Error(`Penpot can't hold these tokens of tokens.json:\n${problems.join('\n')}`)
	const tokenNames = new Set(sets.flatMap(({ tokens: setTokens }) => Object.keys(setTokens)))
	const plan: TokenSyncPlan = {
		sets,
		themes: TOKEN_THEMES,
		defaultTheme: { group: 'Mode', name: 'Light' },
		migrations: resolveMigrations(migrations, tokenNames),
		pauseMs,
	}
	return [
		'// Token sync, generated by @brrritscold/design-core-js/token-sync from tokens.json and',
		'// design/token-migrations.json. Run it as the body of one execute_code call in the tab of',
		'// the file to sync; it returns { changes, flagged }, and a second run returns no changes.',
		// A build that keeps function names wraps nested functions in `__name`; make it a no-op.
		'const __name = (target) => target',
		`const sameToken = ${sameToken.toString()}`,
		`const plan = ${JSON.stringify(plan)}`,
		`return await (${syncTokens.toString()})(penpot, plan, sameToken)`,
		'',
	].join('\n')
}
