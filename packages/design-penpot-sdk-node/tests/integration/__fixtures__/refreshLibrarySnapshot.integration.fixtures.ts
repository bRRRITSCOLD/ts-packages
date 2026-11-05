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

const BASE_SHA = 'b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0'
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
