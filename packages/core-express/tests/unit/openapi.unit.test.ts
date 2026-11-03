// node_modules
import { expect } from 'chai'
import express, { type NextFunction, type Request, type Response, Router } from 'express'
import request from 'supertest'

// src
import { createOpenApiRouter, replacePath } from '../../src/lib/openapi/index.js'

/**
 * A hand-written stand-in for what openapi-typescript generates, small enough
 * to read but carrying every shape the router binds against: a path param, a
 * query param, a request body and a typed response.
 */
type TestPaths = {
	'/todos': {
		get: {
			parameters: { query: { completed?: boolean } }
			responses: {
				200: { content: { 'application/json': { ids: string[] } } }
			}
		}
		post: {
			requestBody: { content: { 'application/json': { title: string } } }
			responses: {
				200: { content: { 'application/json': { id: string } } }
			}
		}
	}
	'/todos/{id}': {
		get: {
			parameters: { path: { id: string } }
			responses: {
				200: { content: { 'application/json': { id: string } } }
			}
		}
		patch: {
			parameters: { path: { id: string } }
			requestBody: { content: { 'application/json': { title: string } } }
			responses: {
				200: { content: { 'application/json': { id: string } } }
			}
		}
		put: {
			parameters: { path: { id: string } }
			requestBody: { content: { 'application/json': { title: string } } }
			responses: {
				200: { content: { 'application/json': { id: string } } }
			}
		}
		delete: {
			parameters: { path: { id: string } }
			responses: {
				200: { content: { 'application/json': { id: string } } }
			}
		}
	}
}

/**
 * Mounts a router on a real express app with an error handler that reports what
 * reached it, so a test can assert on the wiring rather than on a spy.
 */
const appWith = (router: Router) => {
	const app = express()

	app.use(express.json())
	app.use(router)
	app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
		res.status(500).json({ message: error.message })
	})

	return app
}

describe('lib/openapi/index.ts', () => {
	describe('replacePath', () => {
		it('should rewrite an OpenAPI path param into the express form.', () => {
			expect(replacePath('/todos/{id}')).to.equal('/todos/:id')
		})

		it('should rewrite every param, not only the first.', () => {
			expect(replacePath('/owners/{ownerId}/todos/{id}')).to.equal(
				'/owners/:ownerId/todos/:id'
			)
		})

		it('should leave a path with no params alone.', () => {
			expect(replacePath('/health-check')).to.equal('/health-check')
		})
	})

	describe('createOpenApiRouter', () => {
		it('should expose the router it wraps so it can still be mounted.', () => {
			const router = Router()

			expect(createOpenApiRouter<TestPaths>(router)._router).to.equal(router)
		})

		it('should serve a get route declared with the spec path template.', async () => {
			const openApiRouter = createOpenApiRouter<TestPaths>(Router())

			openApiRouter.get('/todos/{id}', {
				handler: (req, res) => {
					res.json({ id: req.params.id })
				},
			})

			const response = await request(appWith(openApiRouter._router)).get('/todos/abc')

			expect(response.status).to.equal(200)
			expect(response.body).to.deep.equal({ id: 'abc' })
		})

		it('should type the query params off the operation.', async () => {
			const openApiRouter = createOpenApiRouter<TestPaths>(Router())

			openApiRouter.get('/todos', {
				handler: (req, res) => {
					res.json({ ids: [String(req.query.completed)] })
				},
			})

			const response = await request(appWith(openApiRouter._router)).get(
				'/todos?completed=true'
			)

			expect(response.body).to.deep.equal({ ids: ['true'] })
		})

		it('should serve post, patch, put and delete on the same path.', async () => {
			const openApiRouter = createOpenApiRouter<TestPaths>(Router())

			openApiRouter.post('/todos', {
				handler: (req, res) => {
					res.json({ id: `post:${req.body.title}` })
				},
			})
			openApiRouter.patch('/todos/{id}', {
				handler: (req, res) => {
					res.json({ id: `patch:${req.params.id}` })
				},
			})
			openApiRouter.put('/todos/{id}', {
				handler: (req, res) => {
					res.json({ id: `put:${req.params.id}` })
				},
			})
			openApiRouter.delete('/todos/{id}', {
				handler: (req, res) => {
					res.json({ id: `delete:${req.params.id}` })
				},
			})

			const agent = request(appWith(openApiRouter._router))

			expect((await agent.post('/todos').send({ title: 'x' })).body).to.deep.equal({
				id: 'post:x',
			})
			expect((await agent.patch('/todos/1').send({ title: 'x' })).body).to.deep.equal({
				id: 'patch:1',
			})
			expect((await agent.put('/todos/2').send({ title: 'x' })).body).to.deep.equal({
				id: 'put:2',
			})
			expect((await agent.delete('/todos/3')).body).to.deep.equal({
				id: 'delete:3',
			})
		})

		it('should run the configured middlewares, in order, before the handler.', async () => {
			const openApiRouter = createOpenApiRouter<TestPaths>(Router())
			const calls: string[] = []

			openApiRouter.get('/todos/{id}', {
				middlewares: [
					(_req, _res, next) => {
						calls.push('first')
						next()
					},
					(_req, _res, next) => {
						calls.push('second')
						next()
					},
				],
				handler: (req, res) => {
					calls.push('handler')
					res.json({ id: req.params.id })
				},
			})

			await request(appWith(openApiRouter._router)).get('/todos/abc')

			expect(calls).to.deep.equal(['first', 'second', 'handler'])
		})

		it('should serve a route configured without middlewares.', async () => {
			const openApiRouter = createOpenApiRouter<TestPaths>(Router())

			openApiRouter.get('/todos/{id}', {
				handler: (req, res) => {
					res.json({ id: req.params.id })
				},
			})

			expect(
				(await request(appWith(openApiRouter._router)).get('/todos/abc')).status
			).to.equal(200)
		})

		it('should forward a rejected handler to the error middleware.', async () => {
			const openApiRouter = createOpenApiRouter<TestPaths>(Router())

			openApiRouter.get('/todos/{id}', {
				handler: async () => {
					throw new Error('async boom')
				},
			})

			const response = await request(appWith(openApiRouter._router)).get('/todos/abc')

			expect(response.status).to.equal(500)
			expect(response.body).to.deep.equal({ message: 'async boom' })
		})

		it('should forward a synchronous throw to the error middleware.', async () => {
			const openApiRouter = createOpenApiRouter<TestPaths>(Router())

			openApiRouter.get('/todos/{id}', {
				handler: () => {
					throw new Error('sync boom')
				},
			})

			const response = await request(appWith(openApiRouter._router)).get('/todos/abc')

			expect(response.status).to.equal(500)
			expect(response.body).to.deep.equal({ message: 'sync boom' })
		})
	})
})
