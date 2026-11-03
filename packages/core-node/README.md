# @brrritscold/core-node

Node-only core utilities — `dotenv`, `jwt`, `mongodb`, `postgres`, `s3`, `secrets-manager`, `query`.

## Installation

```bash
pnpm add @brrritscold/core-node
```

API docs: `pnpm --filter @brrritscold/core-node generate:docs` (typedoc → `docs/`).


## Features

- Type-safety
- ESM + CJS compatabilities
  - any `import ... from '@brrritscold/core-node'` in documentation can be replaced with a `const ... = require('@brrritscold/core-node')`


### Peer Dependencies

This package declares certain dependencies as **peer dependencies** to avoid version conflicts and reduce bundle size. Install only the peer dependencies you need based on which features you use:

| Feature                                                        | Required Peer Dependencies                                           | Install Command                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **S3** (`@brrritscold/core-node/s3`)                           | `@aws-sdk/client-s3`<br>`@aws-sdk/credential-providers`              | `npm install @aws-sdk/client-s3 @aws-sdk/credential-providers`              |
| **Secrets Manager** (`@brrritscold/core-node/secrets-manager`) | `@aws-sdk/client-secrets-manager`<br>`@aws-sdk/credential-providers` | `npm install @aws-sdk/client-secrets-manager @aws-sdk/credential-providers` |
| **MongoDB** (`@brrritscold/core-node/mongodb`)                 | `mongodb`                                                            | `npm install mongodb`                                                       |
| **Postgres** (`@brrritscold/core-node/postgres`)               | `knex`<br>`pg`                                                       | `npm install knex pg`                                                       |
| **Query** (`@brrritscold/core-node/query`)                     | `@brrritscold/core-js`                                               | `npm install @brrritscold/core-js`                                          |
| **Query, MongoDB** (`@brrritscold/core-node/query/mongodb`)    | `@brrritscold/core-js`<br>`mongodb`                                  | `npm install @brrritscold/core-js mongodb`                                  |

**Example**: If using S3 features only:
```bash
npm install @brrritscold/core-node @aws-sdk/client-s3 @aws-sdk/credential-providers
```

**Example**: If using both S3 and MongoDB:
```bash
npm install @brrritscold/core-node @aws-sdk/client-s3 @aws-sdk/credential-providers mongodb
```

**Note**: You will see peer dependency warnings during `npm install` if peer dependencies are missing. These warnings indicate which packages need to be installed for the features you intend to use.

#### Optional peers still get installed by npm

The peers are marked `optional` in `peerDependenciesMeta`, which suppresses the missing-peer warning but does not stop npm from installing them — a Mongo-only consumer on npm still gets `knex` and `pg`. pnpm consumers are not affected.

## FAQs

- What does type-safety mean for the features?
  - All libs, functions and exports are fully typed on inputs and returns. Some go further — `createMongoCollectionClient` types filters and updates against the document shape.
- I am not getting type-safety for the `dotenv` module
  - Due to one of the libs we use under the hood being written in js, it's type system relies on 3rd party types. Run this: `npm install --save-dev @types/dotenv-safe` command to install the types as a DevDep and get local type-safety
