// node_modules
import { type InterceptConfig, intercept } from '@brrritscold/testing-core-node/nock'

// fixtures
import type { Recording } from '../../__recordings__/recordings.js'

/** The tier's Penpot: `.env.integration.test` points it at an origin nock alone answers. */
export const penpotUrl = (): string => process.env.PENPOT_URL as string
export const accessToken = (): string => process.env.SNAPSHOT_REFRESH_PENPOT_TOKEN as string

/**
 * Replays a recording with nock: each recorded request is answered with Penpot's recorded
 * answer, and only when it carries the access token and exactly the recorded body (so a
 * `features` param, or any other extra, finds no recording and fails).
 */
export const replay = ({ interactions }: Recording) =>
	intercept(
		interactions.map(
			({
				method,
				path,
				requestBody,
				status,
				responseBody,
				responseText,
			}): InterceptConfig => ({
				method: method === 'GET' ? 'get' : 'post',
				url: penpotUrl(),
				endpoint: path,
				...(method === 'POST'
					? {
							headers: { authorization: `Token ${accessToken()}` },
							body: requestBody as Record<string, string>,
						}
					: {}),
				reply: { statusCode: status, body: responseBody ?? responseText },
			})
		)
	)
