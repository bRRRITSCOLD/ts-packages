// node_modules
import type { InterceptConfig } from '@brrritscold/testing-core-node/nock'

// testee
import {
	LIBRARY_SNAPSHOT_PATH,
	SNAPSHOT_REFRESH_BRANCH,
	SNAPSHOT_REFRESH_TITLE,
} from '../../../src/snapshot-refresh.js'

export const GITHUB_API_URL = 'https://api.github.com'
export const REPO = 'bRRRITSCOLD/ts-packages'
export const BASE = 'main'

export const BASE_SHA = 'b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0'
const BASE_TREE_SHA = 'c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1'
const TREE_SHA = 'd2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2'
export const COMMIT_SHA = 'e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e3'

/** The snapshot committed before this refresh: an older, different one. */
export const STALE_SNAPSHOT = '{\n\t"schemaVersion": 1\n}\n'

export const OPEN_PULL = {
	number: 71,
	html_url: `https://github.com/${REPO}/pull/71`,
}

const github = (
	config: Omit<InterceptConfig, 'url' | 'endpoint'> & { path: string }
): InterceptConfig => {
	const { path, ...rest } = config
	return {
		url: GITHUB_API_URL,
		endpoint: `/repos/${REPO}${path}`,
		headers: { authorization: `Bearer ${process.env.SNAPSHOT_REFRESH_GITHUB_TOKEN}` },
		...rest,
	}
}

/** `GET contents` of the snapshot on `ref`: its text, or 404 when `content` is null. */
export const readSnapshot = (ref: string, content: string | null): InterceptConfig =>
	github({
		method: 'get',
		path: `/contents/${LIBRARY_SNAPSHOT_PATH}`,
		query: { ref },
		reply:
			content === null
				? { statusCode: 404, body: { message: 'Not Found' } }
				: { statusCode: 200, body: content },
	})

/** `GET pulls` for the refresh branch: the open PR, or none. */
export const listOpenPulls = (open: typeof OPEN_PULL | null): InterceptConfig =>
	github({
		method: 'get',
		path: '/pulls',
		query: { state: 'open', head: `bRRRITSCOLD:${SNAPSHOT_REFRESH_BRANCH}`, base: BASE },
		reply: { statusCode: 200, body: open ? [open] : [] },
	})

/**
 * The commit of `snapshot` on top of the base branch, ending with the refresh branch created
 * (`branchExists: false`) or force-moved (`true`). Tree and commit bodies must match exactly.
 */
export const commitSnapshot = (snapshot: string, branchExists: boolean): InterceptConfig[] => [
	github({
		method: 'get',
		path: `/git/ref/heads/${BASE}`,
		reply: { statusCode: 200, body: { object: { sha: BASE_SHA } } },
	}),
	github({
		method: 'get',
		path: `/git/commits/${BASE_SHA}`,
		reply: { statusCode: 200, body: { sha: BASE_SHA, tree: { sha: BASE_TREE_SHA } } },
	}),
	github({
		method: 'post',
		path: '/git/trees',
		body: {
			base_tree: BASE_TREE_SHA,
			tree: [
				{ path: LIBRARY_SNAPSHOT_PATH, mode: '100644', type: 'blob', content: snapshot },
			],
		},
		reply: { statusCode: 201, body: { sha: TREE_SHA } },
	}),
	github({
		method: 'post',
		path: '/git/commits',
		body: { message: SNAPSHOT_REFRESH_TITLE, tree: TREE_SHA, parents: [BASE_SHA] },
		reply: { statusCode: 201, body: { sha: COMMIT_SHA } },
	}),
	github({
		method: 'get',
		path: `/git/ref/heads/${SNAPSHOT_REFRESH_BRANCH}`,
		reply: branchExists
			? { statusCode: 200, body: { object: { sha: BASE_SHA } } }
			: { statusCode: 404, body: { message: 'Not Found' } },
	}),
	branchExists
		? github({
				method: 'patch',
				path: `/git/refs/heads/${SNAPSHOT_REFRESH_BRANCH}`,
				body: { sha: COMMIT_SHA, force: true },
				reply: { statusCode: 200, body: { object: { sha: COMMIT_SHA } } },
			})
		: github({
				method: 'post',
				path: '/git/refs',
				body: { ref: `refs/heads/${SNAPSHOT_REFRESH_BRANCH}`, sha: COMMIT_SHA },
				reply: { statusCode: 201, body: { object: { sha: COMMIT_SHA } } },
			}),
]

/** A lockstep `core-react` PR: open into the base branch from a branch of the same repo. */
export const LOCKSTEP_PULL = {
	number: 96,
	html_url: `https://github.com/${REPO}/pull/96`,
	head: {
		ref: 'feat/select-combobox',
		sha: 'f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4f4',
		repo: { full_name: REPO },
	},
}

/** A PR from a fork; its snapshot is never read. */
export const FORK_PULL = {
	number: 98,
	html_url: `https://github.com/${REPO}/pull/98`,
	head: {
		ref: 'main',
		sha: 'a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5',
		repo: { full_name: 'someone/ts-packages' },
	},
}

/** `GET pulls` for every open PR into the base branch (the lockstep check). */
export const listPullsIntoBase = (pulls: (typeof LOCKSTEP_PULL)[]): InterceptConfig =>
	github({
		method: 'get',
		path: '/pulls',
		query: { state: 'open', base: BASE, per_page: '100' },
		reply: { statusCode: 200, body: pulls },
	})

/** The open refresh PR as `listPullsIntoBase` lists it. */
export const OPEN_PULL_LISTED = {
	...OPEN_PULL,
	head: { ref: SNAPSHOT_REFRESH_BRANCH, sha: BASE_SHA, repo: { full_name: REPO } },
}

/** Closing the open refresh PR because a lockstep PR already carries the snapshot. */
export const deferOpenPull = (): InterceptConfig[] => [
	github({
		method: 'post',
		path: `/issues/${OPEN_PULL.number}/comments`,
		body: {
			body: `Lockstep PR #${LOCKSTEP_PULL.number} already carries this library snapshot; nothing to merge here.`,
		},
		reply: { statusCode: 201, body: { id: 1 } },
	}),
	github({
		method: 'patch',
		path: `/pulls/${OPEN_PULL.number}`,
		body: { state: 'closed' },
		reply: { statusCode: 200, body: { number: OPEN_PULL.number, state: 'closed' } },
	}),
	github({
		method: 'delete',
		path: `/git/refs/heads/${SNAPSHOT_REFRESH_BRANCH}`,
		reply: { statusCode: 204, body: '' },
	}),
]

/** `POST pulls` from the refresh branch into the base branch. */
export const createPull = (): InterceptConfig =>
	github({
		method: 'post',
		path: '/pulls',
		body: (body: Record<string, unknown>) =>
			body.title === SNAPSHOT_REFRESH_TITLE &&
			body.head === SNAPSHOT_REFRESH_BRANCH &&
			body.base === BASE &&
			typeof body.body === 'string',
		reply: {
			statusCode: 201,
			body: { number: 72, html_url: `https://github.com/${REPO}/pull/72` },
		},
	})

/** `GET ref` of the base branch: its head commit. */
export const readBaseRef = (): InterceptConfig =>
	github({
		method: 'get',
		path: `/git/ref/heads/${BASE}`,
		reply: { statusCode: 200, body: { object: { sha: BASE_SHA } } },
	})

/**
 * Closing the open refresh PR the library no longer needs: the comment naming the base
 * commit, the close, then the refresh branch's delete. Labels are never touched.
 */
export const closeOpenPull = (): InterceptConfig[] => [
	github({
		method: 'post',
		path: `/issues/${OPEN_PULL.number}/comments`,
		body: { body: `Library matches ${BASE} at ${BASE_SHA}; nothing to merge.` },
		reply: { statusCode: 201, body: { id: 1 } },
	}),
	github({
		method: 'patch',
		path: `/pulls/${OPEN_PULL.number}`,
		body: { state: 'closed' },
		reply: { statusCode: 200, body: { number: OPEN_PULL.number, state: 'closed' } },
	}),
	github({
		method: 'delete',
		path: `/git/refs/heads/${SNAPSHOT_REFRESH_BRANCH}`,
		reply: { statusCode: 204, body: '' },
	}),
]
