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

// return response content(s) for a specific status code(s) from an operation object, allowing any media type
export type OperationResponseContent<
	PathOperation,
	Status extends keyof OperationResponses<PathOperation>,
	Media extends MediaType = MediaType,
> = FilterKeys<OperationContent<FilterKeys<OperationResponses<PathOperation>, Status>>, Media>

// return 2XX response(s) from a operation object, allowing any media type
export type OperationSuccessResponseContent<
	PathOperation,
	Media extends MediaType = MediaType,
> = OperationResponseContent<PathOperation, OkStatus, Media>

// return first `parameters/path` from an operation object
export type OperationPathParams<PathOperation> = PathOperation extends {
	parameters: { path: unknown }
}
	? NonNullable<PathOperation['parameters']['path']>
	: never

// return first `parameters/query` from an operation object
export type OperationQueryParams<PathOperation> = PathOperation extends {
	parameters: { query: unknown }
}
	? NonNullable<PathOperation['parameters']['query']>
	: never

// return first `parameters/header` from an operation object
export type OperationHeader<PathOperation> = PathOperation extends {
	parameters: { header: unknown }
}
	? NonNullable<PathOperation['parameters']['header']>
	: never

// return `content` for a Response Object
export type OperationContent<ObjectWithContent> = ObjectWithContent extends {
	content: unknown
}
	? ObjectWithContent['content']
	: unknown

// `any` rather than `unknown`: this only has to match the presence of a
// `responses` key on whatever openapi-typescript generated, and `unknown`
// makes the conditional fail for operations whose responses are a union.
export type OperationResponses<PathOperation> = PathOperation extends {
	// biome-ignore lint/suspicious/noExplicitAny: `unknown` breaks the conditional for union responses (see above)
	responses: any
}
	? PathOperation['responses']
	: never

export type OpenApiRouteConfig<PathOperation> = {
	handler: OpenApiRequestHandler<PathOperation>
	middlewares?: OpenApiRequestHandler<PathOperation> | RequestHandler[]
}

export type OpenApiQueryParams<PathOperation> =
	OperationQueryParams<PathOperation> extends never
		? Record<string, unknown>
		: OperationQueryParams<PathOperation>

export type OpenApiPathParams<PathOperation> =
	OperationPathParams<PathOperation> extends never
		? Record<string, unknown>
		: OperationPathParams<PathOperation>

export type OpenApiRequestBody<PathOperation> = RequestBodyJSON<PathOperation>

export type OpenApiResponse<PathOperation> = Response<
	OperationSuccessResponseContent<PathOperation>,
	Locals
>

// decorate the base express request object wth the specific
// info provided from the paths type
export type OpenApiRequest<PathOperation> = Request<
	OpenApiPathParams<PathOperation>, // request path params
	OperationSuccessResponseContent<PathOperation>, // response body
	OpenApiRequestBody<PathOperation>, // request body
	OpenApiQueryParams<PathOperation> // request query params
>

export type OpenApiRequestHandler<PathOperation> = (
	req: OpenApiRequest<PathOperation>,
	res: OpenApiResponse<PathOperation>,
	next: NextFunction
) => Promise<void> | void

export type OpenApiRouterMethod<Paths extends object, Method extends HttpMethod> = <
	Path extends PathsWithMethod<Paths, Method>,
	PathOperation extends FilterKeys<Paths[Path], Method>,
>(
	path: Path | (string & Record<never, never>),
	config: OpenApiRouteConfig<PathOperation>
) => void

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
