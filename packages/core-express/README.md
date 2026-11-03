# @brrritscold/core-express

Express (node only) middlewares and helpers — JWT middleware, a typed OpenAPI router and server creation.

## Installation

```bash
pnpm add @brrritscold/core-express
```

API docs: `pnpm --filter @brrritscold/core-express generate:docs` (typedoc → `docs/`).


## Features

- ESM + CJS compatabilities
  - any `import ... from '@brrritscold/core-express'` in documentation can be replaced with a `const ... = require('@brrritscold/core-express')`
- `openapi.createOpenApiRouter` - an Express router bound to the service's OpenAPI contract, so a route that drifts from the spec fails to compile

  ```ts
  import { openapi } from '@brrritscold/core-express'
  import { Router } from 'express'

  import type { paths } from './types/openapi.js'

  const todosRouter = Router()
  const openApiRouter = openapi.createOpenApiRouter<paths>(todosRouter)

  openApiRouter.get('/v1/todos/{id}', {
      middlewares: [authMiddleware],
      handler: async (req, res) => {
          // req.params.id, req.query, req.body and the response body are all
          // typed from the operation the spec declares for this path.
          res.json(await todosService.getTodo(req.params.id))
      }
  })

  app.use(openApiRouter._router)
  ```

  Paths are written exactly as the spec writes them - `{id}` is rewritten to Express' `:id` - and a handler that rejects is forwarded to the error middleware rather than left unhandled.

  `paths` is the type generated from the service's spec by [openapi-typescript](https://github.com/openapi-ts/openapi-typescript).

## FAQs

- Ask away!
