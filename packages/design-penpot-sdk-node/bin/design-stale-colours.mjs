#!/usr/bin/env node
// The design-stale-colours CLI; see `runStaleColoursCli` in src/stale-colours.ts.
import { runStaleColoursCli } from '../dist/stale-colours.mjs'

process.exitCode = await runStaleColoursCli(process.argv.slice(2))
