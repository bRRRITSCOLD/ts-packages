// node_modules

import type { Locals, NextFunction, Request, RequestHandler, Response, Router } from 'express'
import type {
	FilterKeys,
	HttpMethod,
	MediaType,
	OkStatus,
	PathsWithMethod,
	RequestBodyJSON,
} from 'openapi-typescript-helpers'

/** Resolves the response body type an operation declares for the given status code(s), narrowed to the given media type (any by default). */
export type OperationResponseContent<
	PathOperation,
	Status extends keyof OperationResponses<PathOperation>,
	Media extends MediaType = MediaType,
> = FilterKeys<OperationContent<FilterKeys<OperationResponses<PathOperation>, Status>>, Media>

/** Resolves the response body type an operation declares for its 2XX success status codes, narrowed to the given media type (any by default). */
export type OperationSuccessResponseContent<
	PathOperation,
	Media extends MediaType = MediaType,
> = OperationResponseContent<PathOperation, OkStatus, Media>

/** Extracts the `parameters.path` object an operation declares, or `never` if it declares none. */
export type OperationPathParams<PathOperation> = PathOperation extends {
	parameters: { path: unknown }
}
	? NonNullable<PathOperation['parameters']['path']>
	: never

/** Extracts the `parameters.query` object an operation declares, or `never` if it declares none. */
export type OperationQueryParams<PathOperation> = PathOperation extends {
	parameters: { query: unknown }
}
	? NonNullable<PathOperation['parameters']['query']>
	: never

/** Extracts the `parameters.header` object an operation declares, or `never` if it declares none. */
export type OperationHeader<PathOperation> = PathOperation extends {
	parameters: { header: unknown }
}
	? NonNullable<PathOperation['parameters']['header']>
	: never

/** Extracts the `content` map (media type to body) from a response object, or `unknown` if it has none. */
export type OperationContent<ObjectWithContent> = ObjectWithContent extends {
	content: unknown
}
	? ObjectWithContent['content']
	: unknown

/** Extracts the `responses` map (status code to response object) from an operation, or `never` if it has none. */
// `any` rather than `unknown`: this only has to match the presence of a
// `responses` key on whatever openapi-typescript generated, and `unknown`
// makes the conditional fail for operations whose responses are a union.
export type OperationResponses<PathOperation> = PathOperation extends {
	// biome-ignore lint/suspicious/noExplicitAny: `unknown` breaks the conditional for union responses (see above)
	responses: any
}
	? PathOperation['responses']
	: never

/** Route definition passed to an `OpenApiRouter` method: the typed handler for the operation plus optional middlewares that run before it. */
export type OpenApiRouteConfig<PathOperation> = {
	handler: OpenApiRequestHandler<PathOperation>
	middlewares?: OpenApiRequestHandler<PathOperation> | RequestHandler[]
}

/** Type of `req.query` for an operation: its declared query parameters, falling back to `Record<string, unknown>` when it declares none. */
export type OpenApiQueryParams<PathOperation> =
	OperationQueryParams<PathOperation> extends never
		? Record<string, unknown>
		: OperationQueryParams<PathOperation>

/** Type of `req.params` for an operation: its declared path parameters, falling back to `Record<string, unknown>` when it declares none. */
export type OpenApiPathParams<PathOperation> =
	OperationPathParams<PathOperation> extends never
		? Record<string, unknown>
		: OperationPathParams<PathOperation>

/** Type of `req.body` for an operation: the JSON request body it declares. */
export type OpenApiRequestBody<PathOperation> = RequestBodyJSON<PathOperation>

/** Express `Response` whose body is typed as the operation's 2XX success response content. */
export type OpenApiResponse<PathOperation> = Response<
	OperationSuccessResponseContent<PathOperation>,
	Locals
>

/** Express `Request` typed from an operation: path params, success response body, JSON request body and query params all come from the OpenAPI `paths` type. */
export type OpenApiRequest<PathOperation> = Request<
	OpenApiPathParams<PathOperation>, // request path params
	OperationSuccessResponseContent<PathOperation>, // response body
	OpenApiRequestBody<PathOperation>, // request body
	OpenApiQueryParams<PathOperation> // request query params
>

/** Express handler signature whose `req` and `res` are typed from an OpenAPI operation; may be async. */
export type OpenApiRequestHandler<PathOperation> = (
	req: OpenApiRequest<PathOperation>,
	res: OpenApiResponse<PathOperation>,
	next: NextFunction
) => Promise<void> | void

/** Route-registration method for one HTTP verb: accepts a path the spec declares for that verb (any string is still allowed) and a config whose handler is typed from the matching operation. */
export type OpenApiRouterMethod<Paths extends object, Method extends HttpMethod> = <
	Path extends PathsWithMethod<Paths, Method>,
	PathOperation extends FilterKeys<Paths[Path], Method>,
>(
	path: Path | (string & Record<never, never>),
	config: OpenApiRouteConfig<PathOperation>
) => void

/** Typed facade returned by `createOpenApiRouter`: `get`/`post`/`patch`/`put`/`delete` methods bound to the spec, with the underlying Express router exposed as `_router`. */
export type OpenApiRouter<P extends object> = {
	_router: Router
	get: OpenApiRouterMethod<P, 'get'>
	post: OpenApiRouterMethod<P, 'post'>
	patch: OpenApiRouterMethod<P, 'patch'>
	put: OpenApiRouterMethod<P, 'put'>
	delete: OpenApiRouterMethod<P, 'delete'>
}

/**
 * Rewrites an OpenAPI path template into the Express form.
 *
 * The spec writes `/todos/{id}`; Express wants `/todos/:id`. Doing it here is
 * what lets a route be declared with the exact string the spec uses, so the
 * `Path` generic can be checked against the `paths` type.
 */
export function replacePath(path: string): string {
	return path.replace(/\{(?<name>\w+)\}/g, ':$<name>')
}

/**
 * Forwards a rejected handler to `next` so it reaches the error middleware.
 *
 * Express 5 does this for async handlers on its own, but the wrapper is kept so
 * the behaviour does not depend on the major version a consumer resolves.
 */
function requestHandler(handler: RequestHandler): RequestHandler {
	return async (req, res, next) => {
		try {
			await handler(req, res, next)
		} catch (error) {
			next(error)
		}
	}
}

/**
 * Wraps an Express router so each route is bound to an OpenAPI operation.
 *
 * `P` is the `paths` type generated from the service's spec by
 * openapi-typescript. The path string is then constrained to one the spec
 * declares for that method, and the handler receives `req.params`, `req.query`,
 * `req.body` and the response body typed from that operation — so a route that
 * drifts from the contract fails to compile rather than at runtime.
 *
 * @param router The Express router to bind routes onto.
 *
 * @returns A typed facade over that router; the router itself stays reachable
 * as `_router` for mounting.
 *
 * @example
 * ```ts
 * import type { paths } from '../../types/openapi.js'
 *
 * const todosRouter = Router()
 * const openApiRouter = createOpenApiRouter<paths>(todosRouter)
 *
 * openApiRouter.get('/v1/todos/{id}', {
 *     handler: async (req, res) => {
 *         res.json(await todosService.getTodo(req.params.id))
 *     }
 * })
 * ```
 */
export const createOpenApiRouter = <P extends object>(router: Router) => {
	const openApiRouter: OpenApiRouter<P> = {
		_router: router,
		get(this, path, config) {
			this._router.get(
				replacePath(path as string),
				...((config.middlewares as RequestHandler[]) ?? []),
				requestHandler(config.handler as RequestHandler)
			)
		},
		post(this, path, config) {
			this._router.post(
				replacePath(path as string),
				...((config.middlewares as RequestHandler[]) ?? []),
				requestHandler(config.handler as RequestHandler)
			)
		},
		patch(this, path, config) {
			this._router.patch(
				replacePath(path as string),
				...((config.middlewares as RequestHandler[]) ?? []),
				requestHandler(config.handler as RequestHandler)
			)
		},
		put(this, path, config) {
			this._router.put(
				replacePath(path as string),
				...((config.middlewares as RequestHandler[]) ?? []),
				requestHandler(config.handler as RequestHandler)
			)
		},
		delete(path, config) {
			this._router.delete(
				replacePath(path as string),
				...((config.middlewares as RequestHandler[]) ?? []),
				requestHandler(config.handler as RequestHandler)
			)
		},
	}

	return openApiRouter
}
