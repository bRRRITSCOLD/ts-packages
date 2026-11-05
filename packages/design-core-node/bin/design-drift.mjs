#!/usr/bin/env node
// The design-drift CLI; see `runDriftCli` in src/drift-check.ts.
import { runDriftCli } from '../dist/drift-check.mjs'

process.exitCode = runDriftCli(process.argv.slice(2))
