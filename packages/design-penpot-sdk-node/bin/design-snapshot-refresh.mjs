#!/usr/bin/env node
// The design-snapshot-refresh CLI; see `runSnapshotRefreshCli` in src/snapshot-refresh.ts.
import { runSnapshotRefreshCli } from '../dist/snapshot-refresh.mjs'

process.exitCode = await runSnapshotRefreshCli(process.argv.slice(2))
