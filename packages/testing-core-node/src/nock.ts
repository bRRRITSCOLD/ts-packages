// node_modules
import nock, {
	Body,
	DataMatcherMap,
	ReplyHeaders,
	RequestBodyMatcher,
	RequestHeaderMatcher,
	Scope,
	StatusCode,
} from 'nock'
import { ParsedUrlQuery } from 'querystring'

/** Describes one HTTP interception for `intercept`: method, base URL and endpoint to match (optionally by headers, body and query), plus the reply, delay or error to return. */
export type InterceptConfig = {
	method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'
	url: string
	endpoint: string
	headers?: Record<string, RequestHeaderMatcher>
	body?: RequestBodyMatcher
	delay?: number
	replyWithError?:
		| ((errorMessage: string | object) => Scope)
		| ((statusCode: StatusCode, fileName: string, headers?: ReplyHeaders) => Scope)
	query?:
		| boolean
		| string
		| DataMatcherMap
		| URLSearchParams
		| { (parsedObj: ParsedUrlQuery): boolean }
	reply: {
		body?: Body
		statusCode: number
	}
}

/**
 * Registers a nock interceptor for each config and returns the resulting scopes, so tests can assert every expected request was made via `scope.isDone()`.
 *
 * @example
 * // node_modules
 * import { clearInterceptors, intercept } from '@brrritscold/testing-core-node/nock'
 *
 * // set up http interceptors
 * const interceptScopes = intercept([{
 *     method: 'post',
 *     url: 'https://dummyjson.com',
 *     endpoint: '/products',
 *     body: (body: GenericRecord) => {
 *         return body.name === product.name && body.damage === product.damage
 *     },
 *     reply: {
 *         statusCode: 200,
 *         body: { id: 1, name: product.name, damage: product.damage }
 *     }
 * }, {
 *     method: 'put',
 *     url: 'https://dummyjson.com',
 *     endpoint: '/products/1',
 *     body: (body: GenericRecord) => {
 *         return body.name === productPut.name && body.damage === productPut.damage
 *     },
 *     reply: {
 *         statusCode: 200,
 *         body: { id: 1, name: productPut.name, damage: productPut.damage }
 *     }
 * }])
 *
 * // make http calls (these will be intercepted)
 * const postResponse = await fetch('https://dummyjson.com/products', {
 *     method: 'post',
 *     headers: { 'content-type': 'application/json' },
 *     body: JSON.stringify({ name: product.name, damage: product.damage })
 * })
 *
 * const putResponse = await fetch('https://dummyjson.com/products/1', {
 *     method: 'put',
 *     headers: { 'content-type': 'application/json' },
 *     body: JSON.stringify({ name: productPut.name, damage: productPut.damage })
 * })
 *
 * const filtered = interceptScopes.filter(scope => scope.isDone() !== true)
 *
 * console.log(filtered.length)
 * // 0
 *
 * // clear interceptors
 * clearInterceptors()
 *
 * // make http calls (these will NOT be intercepted)
 * const postResponse = await fetch('https://dummyjson.com/products', {
 *     method: 'post',
 *     headers: { 'content-type': 'application/json' },
 *     body: JSON.stringify({ name: product.name, damage: product.damage })
 * })
 *
 * const putResponse = await fetch('https://dummyjson.com/products/1', {
 *     method: 'put',
 *     headers: { 'content-type': 'application/json' },
 *     body: JSON.stringify({ name: productPut.name, damage: productPut.damage })
 * })
 */
export const intercept = (configs: InterceptConfig[]) => {
	const scopes = []

	for (const config of configs) {
		const { method, url, endpoint, headers, delay, replyWithError, query, body, reply } = config

		const scope = nock(url, { reqheaders: headers })

		const interceptor = scope[method](endpoint, body)

		if (query) {
			interceptor.query(query)
		}

		if (delay) {
			interceptor.delay(delay)
		}

		if (replyWithError) {
			interceptor.replyWithError(replyWithError)
		}

		interceptor.reply(reply.statusCode, reply.body)

		scopes.push(scope)
	}

	return scopes
}

/**
 * Removes all registered nock interceptors so subsequent HTTP requests are no longer mocked.
 *
 * @see {@link intercept} examples here
 */
export const clearInterceptors = () => nock.cleanAll()
