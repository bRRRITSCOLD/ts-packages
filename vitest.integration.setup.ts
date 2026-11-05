/**
 * Setup file for every package's `integration` project: loads the package's
 * `.env.integration.test` (from the cwd, the package directory) into `process.env`
 * before any test file runs, overriding variables already set. It does not start
 * containers; `test:integration:setup` does that, once per run.
 */

import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

Object.assign(process.env, parseEnv(readFileSync('.env.integration.test', 'utf8')))
