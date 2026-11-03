import type express from 'express'

export type ServerMiddleware = express.RequestHandler | express.ErrorRequestHandler
