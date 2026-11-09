/**
 * The snapshot refresh's GitHub side, over the REST API with `fetch`: the refresh runs as a
 * CronJob with no checkout, so it reads files, commits and opens pull requests remotely.
 */

/** The GitHub REST API origin. */
const GITHUB_API_URL = 'https://api.github.com'

/** What {@link createGitHubClient} needs. */
export type CreateGitHubClientParameters = {
	/** A PAT allowed to push branches and open pull requests on `repo`. */
	token: string
	/** `owner/name`. */
	repo: string
	/** The `fetch` to call; defaults to the global one. */
	fetch?: typeof fetch
}

/** An open pull request, as the refresh needs it. */
export type GitHubPullRequest = { number: number; url: string }

/** An open pull request with its head: the branch, the commit and the repo it comes from. */
export type GitHubOpenPullRequest = GitHubPullRequest & {
	headRef: string
	headSha: string
	/** `owner/name` of the head's repo; differs from the client's `repo` for a fork. */
	headRepo: string
}

/** What {@link GitHubClient.commitFile} commits. */
export type CommitFileParameters = {
	/** The branch the commit sits on top of. */
	base: string
	/** The branch to point at the commit, created or force-moved. */
	branch: string
	path: string
	content: string
	message: string
}

/** The GitHub calls the snapshot refresh makes, as returned by {@link createGitHubClient}. */
export type GitHubClient = {
	/** A file's text on a branch, or `null` when the file (or the branch) doesn't exist. */
	readFile: (path: string, ref: string) => Promise<string | null>
	/** The open pull request from `branch` into `base`, or `null`. */
	findOpenPullRequest: (branch: string, base: string) => Promise<GitHubPullRequest | null>
	/** Every open pull request into `base` (first 100). */
	listOpenPullRequests: (base: string) => Promise<GitHubOpenPullRequest[]>
	/**
	 * Commits `content` at `path` as a single commit on top of `base`, then points `branch` at
	 * it: created when missing, force-moved when it exists, so the branch never piles up commits.
	 */
	commitFile: (parameters: CommitFileParameters) => Promise<void>
	/** The commit sha a branch points at. */
	readBranchSha: (branch: string) => Promise<string>
	/** Posts a comment on a pull request. */
	commentOnPullRequest: (number: number, body: string) => Promise<void>
	/** Closes a pull request without merging; its labels stay. */
	closePullRequest: (number: number) => Promise<void>
	/** Deletes a branch. */
	deleteBranch: (branch: string) => Promise<void>
	/** Opens a pull request from `branch` into `base`. */
	createPullRequest: (parameters: {
		branch: string
		base: string
		title: string
		body: string
	}) => Promise<GitHubPullRequest>
}

/** Creates the GitHub client the snapshot refresh uses; every non-2xx answer throws, naming the call. */
export const createGitHubClient = ({
	token,
	repo,
	fetch: fetchImpl = fetch,
}: CreateGitHubClientParameters): GitHubClient => {
	const call = async (
		method: string,
		path: string,
		{
			body,
			accept,
			allowNotFound,
		}: { body?: unknown; accept?: string; allowNotFound?: boolean } = {}
	): Promise<Response | null> => {
		const response = await fetchImpl(`${GITHUB_API_URL}/repos/${repo}${path}`, {
			method,
			headers: {
				accept: accept ?? 'application/vnd.github+json',
				authorization: `Bearer ${token}`,
				'user-agent': 'design-snapshot-refresh',
				'x-github-api-version': '2022-11-28',
				...(body === undefined ? {} : { 'content-type': 'application/json' }),
			},
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		})
		if (allowNotFound && response.status === 404) return null
		if (!response.ok)
			throw new Error(
				`GitHub ${method} /repos/${repo}${path} failed (${response.status}): ${await response.text()}`
			)
		return response
	}
	const json = async <T>(method: string, path: string, body?: unknown): Promise<T> =>
		(await (await call(method, path, { body }))?.json()) as T

	const readBranchSha = async (branch: string): Promise<string> =>
		(await json<{ object: { sha: string } }>('GET', `/git/ref/heads/${branch}`)).object.sha

	return {
		readFile: async (path, ref) => {
			const response = await call('GET', `/contents/${path}?ref=${encodeURIComponent(ref)}`, {
				accept: 'application/vnd.github.raw+json',
				allowNotFound: true,
			})
			return response ? response.text() : null
		},

		findOpenPullRequest: async (branch, base) => {
			const owner = repo.split('/')[0]
			const query = new URLSearchParams({ state: 'open', head: `${owner}:${branch}`, base })
			const [pull] = await json<{ number: number; html_url: string }[]>(
				'GET',
				`/pulls?${query}`
			)
			return pull ? { number: pull.number, url: pull.html_url } : null
		},

		listOpenPullRequests: async (base) => {
			const query = new URLSearchParams({ state: 'open', base, per_page: '100' })
			const pulls = await json<
				{
					number: number
					html_url: string
					head: { ref: string; sha: string; repo: { full_name: string } | null }
				}[]
			>('GET', `/pulls?${query}`)
			return pulls.map((pull) => ({
				number: pull.number,
				url: pull.html_url,
				headRef: pull.head.ref,
				headSha: pull.head.sha,
				headRepo: pull.head.repo?.full_name ?? '',
			}))
		},

		readBranchSha: async (branch) => readBranchSha(branch),

		commentOnPullRequest: async (number, body) => {
			await call('POST', `/issues/${number}/comments`, { body: { body } })
		},

		closePullRequest: async (number) => {
			await call('PATCH', `/pulls/${number}`, { body: { state: 'closed' } })
		},

		deleteBranch: async (branch) => {
			await call('DELETE', `/git/refs/heads/${branch}`)
		},

		commitFile: async ({ base, branch, path, content, message }) => {
			const baseSha = await readBranchSha(base)
			const baseCommit = await json<{ tree: { sha: string } }>(
				'GET',
				`/git/commits/${baseSha}`
			)
			const tree = await json<{ sha: string }>('POST', '/git/trees', {
				base_tree: baseCommit.tree.sha,
				tree: [{ path, mode: '100644', type: 'blob', content }],
			})
			const commit = await json<{ sha: string }>('POST', '/git/commits', {
				message,
				tree: tree.sha,
				parents: [baseSha],
			})
			const branchExists = await call('GET', `/git/ref/heads/${branch}`, {
				allowNotFound: true,
			})
			if (branchExists)
				await call('PATCH', `/git/refs/heads/${branch}`, {
					body: { sha: commit.sha, force: true },
				})
			else
				await call('POST', '/git/refs', {
					body: { ref: `refs/heads/${branch}`, sha: commit.sha },
				})
		},

		createPullRequest: async ({ branch, base, title, body }) => {
			const pull = await json<{ number: number; html_url: string }>('POST', '/pulls', {
				title,
				head: branch,
				base,
				body,
			})
			return { number: pull.number, url: pull.html_url }
		},
	}
}
