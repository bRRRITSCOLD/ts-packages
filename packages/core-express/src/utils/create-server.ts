import fs from 'node:fs'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import cors from 'cors'
// node modules
import express, { type Express } from 'express'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yaml'

// types
import type { ServerMiddleware } from '../types/middleware.js'

/** Creates an Express app with permissive CORS, JSON body parsing, optional Swagger UI at `/api-docs` (served from `./openapi.yaml` with `swagger.baseUrl` as its server), and the given middlewares, returning it with `listen(port)` and `close()` helpers. */
export const createServer = (params: {
	middlewares?: ServerMiddleware[]
	swagger?: { baseUrl: string }
}) => {
	const app: Express = express()

	app.use(cors({ origin: '*' }))

	app.use(express.json())

	if (params.swagger?.baseUrl) {
		const file = fs.readFileSync('./openapi.yaml', 'utf8')

		const swaggerDocument = YAML.parse(file)

		swaggerDocument.servers = [{ url: params.swagger.baseUrl }]

		app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
	}

	params.middlewares?.map((middleware) => app.use(middleware))

	return {
		app,
		server: undefined as unknown as Server<typeof IncomingMessage, typeof ServerResponse>,
		async listen(port: number) {
			this.server = this.app.listen(port)
		},
		close() {
			this.server?.close()
		},
	}
}
