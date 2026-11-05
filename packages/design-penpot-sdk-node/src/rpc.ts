/**
 * The Penpot version this package reads. Penpot's file formats are unversioned, so this pin is
 * the only thing that says which `get-file` shape the normalizer expects; bumping it re-records
 * the committed `get-file` recordings in the same change.
 */
export const PENPOT_VERSION = '2.18.6'

/** What {@link createPenpotRpcClient} needs: where Penpot is and an access token to read as. */
export type CreatePenpotRpcClientParameters = {
	/** Penpot's public URL (`https://penpot.example`), or the frontend Service in the cluster. */
	baseUrl: string
	/** An access token of the profile to read as, sent as `Authorization: Token <token>`. */
	accessToken: string
	/** The `fetch` to call; defaults to the global one. */
	fetch?: typeof fetch
}

/** A client for Penpot's backend RPC API, as returned by {@link createPenpotRpcClient}. */
export type PenpotRpcClient = {
	/**
	 * Calls one RPC command with JSON params and returns its JSON result, untyped: the caller
	 * validates what it reads. A non-2xx answer throws, naming the command and Penpot's error code.
	 */
	command: (name: string, params: Record<string, unknown>) => Promise<unknown>
	/** The raw `get-file` result for a file, requested without `features`. */
	getFile: (fileId: string) => Promise<unknown>
	/** The version the Penpot server reports in `/version.txt` (`2.18.6`). */
	getVersion: () => Promise<string>
	/** Throws unless the server runs {@link PENPOT_VERSION}, naming both versions. */
	assertVersion: () => Promise<void>
}

/** Reads the body of a failed RPC answer for the error message: Penpot's error `code`, or text. */
const describeFailure = async (response: Response): Promise<string> => {
	const text = await response.text()
	try {
		const body = JSON.parse(text) as { type?: unknown; code?: unknown }
		return [body.type, body.code].filter((part) => typeof part === 'string').join(' / ') || text
	} catch {
		return text
	}
}

/**
 * Creates a client for Penpot's backend RPC API (`/api/rpc/command/<name>`), authenticated with
 * an access token and asking for JSON, in which Penpot camel-cases every keyword key.
 *
 * `get-file` is called **without** a `features` param, so the backend resolves pointer and
 * object maps itself and answers plain JSON.
 *
 * @example
 * ```ts
 * // CJS
 * const { createPenpotRpcClient } = require('@brrritscold/design-penpot-sdk-node/rpc')
 * // ESM
 * import { createPenpotRpcClient } from '@brrritscold/design-penpot-sdk-node/rpc'
 *
 * const penpot = createPenpotRpcClient({ baseUrl: 'https://penpot.example', accessToken })
 * await penpot.assertVersion()
 * const file = await penpot.getFile('de716cff-f170-81a2-8008-e63b04772bf6')
 * // { id: 'de716cff-…', name: 'Design System Library', data: { pagesIndex: {…}, … }, … }
 * ```
 */
export const createPenpotRpcClient = ({
	baseUrl,
	accessToken,
	fetch: fetchImpl = fetch,
}: CreatePenpotRpcClientParameters): PenpotRpcClient => {
	const origin = baseUrl.replace(/\/+$/, '')

	const command: PenpotRpcClient['command'] = async (name, params) => {
		const response = await fetchImpl(`${origin}/api/rpc/command/${name}`, {
			method: 'POST',
			headers: {
				accept: 'application/json',
				authorization: `Token ${accessToken}`,
				'content-type': 'application/json',
			},
			body: JSON.stringify(params),
		})
		if (!response.ok)
			throw new Error(
				`Penpot RPC ${name} failed (${response.status}): ${await describeFailure(response)}`
			)
		return response.json()
	}

	const getVersion = async (): Promise<string> => {
		const response = await fetchImpl(`${origin}/version.txt`)
		if (!response.ok)
			throw new Error(`Penpot /version.txt failed (${response.status}) at ${origin}`)
		return (await response.text()).trim()
	}

	return {
		command,
		getFile: (fileId) => command('get-file', { id: fileId }),
		getVersion,
		assertVersion: async () => {
			const version = await getVersion()
			if (version !== PENPOT_VERSION)
				throw new Error(
					`Penpot at ${origin} runs ${version}, but this package is pinned to ${PENPOT_VERSION}. ` +
						'Bump PENPOT_VERSION and re-record the get-file recordings (pnpm record:penpot) together.'
				)
		},
	}
}
